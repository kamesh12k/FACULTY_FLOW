import { useEffect, useState, useMemo } from 'react'
import { avatarColors, initialsOf, computeCreditBreakdown, getCategoryConfig } from './utils'

function parseTransactionDetails(reasonText, category) {
  const details = {
    classText: null,
    dayOrder: null,
    period: null,
    subject: null,
    typeText: 'Credit Activity',
  }
  if (!reasonText) return details

  if (category === 'substitute_class') details.typeText = 'Class Substitution'
  else if (category === 'leave_deduction') details.typeText = 'Leave Deduction'
  else if (category === 'manual_adjustment') details.typeText = 'Manual Adjustment'
  else if (category === 'penalty') details.typeText = 'Absence Penalty'
  else if (category === 'correction') details.typeText = 'System Correction'
  else if (category === 'exam_duty') details.typeText = 'Exam Duty'
  else if (category === 'department_duty') details.typeText = 'Department Duty'

  const doMatch = reasonText.match(/Day Order\s+(\d+)/i) || reasonText.match(/DO\s*(\d+)/i)
  if (doMatch) details.dayOrder = `Day Order ${doMatch[1]}`

  const pMatch = reasonText.match(/period\s+(\d+)/i) || reasonText.match(/P\s*(\d+)/i)
  if (pMatch) details.period = `Period ${pMatch[1]}`

  const classMatch = reasonText.match(/in\s+([I|V|X\d\s\w\.\-]+?)(?:\s+Period|\s+Day|\s+DO|$)/i) ||
                     reasonText.match(/for\s+([I|V|X\d\s\w\.\-]+?)(?:\s+Period|\s+Day|\s+DO|$)/i)
  if (classMatch && !classMatch[1].toLowerCase().includes('teacher') && !classMatch[1].toLowerCase().includes('leave')) {
    details.classText = classMatch[1].trim()
  }

  const subjectMatch = reasonText.match(/subject\s+([\w\s\-\d]+)/i) || reasonText.match(/for\s+([\w\s\-\d]+)\s+class/i)
  if (subjectMatch) details.subject = subjectMatch[1].trim()

  return details
}

function Avatar({ name }) {
  const c = avatarColors(name)
  return (
    <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold ${c.bg} ${c.text} shadow-xs border border-white/60`}>
      {initialsOf(name)}
    </div>
  )
}

function CreditChange({ value }) {
  if (value > 0) return <span className="font-mono font-extrabold text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">+{value}</span>
  return <span className="font-mono font-extrabold text-xs text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-200">{value}</span>
}

function BreakdownBar({ earned, deducted, total }) {
  if (total === 0) return null
  const pct = Math.round((earned / (earned + deducted)) * 100) || 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-rose-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 font-mono font-bold">{pct}%</span>
    </div>
  )
}

const FILTER_TABS = ['All', 'Earned', 'Deducted', 'Substitutions', 'Leaves', 'Exam Duty', 'Manual']

export default function CreditHistoryDrawer({ teacher, transactions, onClose, onAdjust }) {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const teacherTxs = useMemo(() => {
    if (!teacher) return []
    return transactions
      .filter(tx => tx.teacher_id === teacher.teacher_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [teacher, transactions])

  const breakdown = useMemo(() => computeCreditBreakdown(teacherTxs), [teacherTxs])

  const filteredTxs = useMemo(() => {
    let out = teacherTxs
    const now = new Date()

    if (dateFilter === 'today') {
      const todayStr = now.toDateString()
      out = out.filter(tx => new Date(tx.created_at).toDateString() === todayStr)
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      out = out.filter(tx => new Date(tx.created_at) >= weekAgo)
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
      out = out.filter(tx => new Date(tx.created_at) >= monthAgo)
    }

    if (categoryFilter === 'Earned') out = out.filter(tx => tx.change > 0)
    else if (categoryFilter === 'Deducted') out = out.filter(tx => tx.change < 0)
    else if (categoryFilter === 'Substitutions') out = out.filter(tx => getCategoryConfig(tx).label.includes('Substitution'))
    else if (categoryFilter === 'Leaves') out = out.filter(tx => getCategoryConfig(tx).label.includes('Leave'))
    else if (categoryFilter === 'Exam Duty') out = out.filter(tx => getCategoryConfig(tx).label.includes('Exam'))
    else if (categoryFilter === 'Manual') out = out.filter(tx => getCategoryConfig(tx).label.includes('Admin'))

    return out
  }, [teacherTxs, categoryFilter, dateFilter])

  const totalEarned = teacherTxs.filter(tx => tx.change > 0).reduce((s, tx) => s + tx.change, 0)
  const totalDeducted = Math.abs(teacherTxs.filter(tx => tx.change < 0).reduce((s, tx) => s + tx.change, 0))

  if (!teacher) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-150 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={teacher.name} />
              <div>
                <h2 className="text-base font-extrabold text-white">{teacher.name}</h2>
                <p className="text-xs text-indigo-200 font-medium">{teacher.department || 'Faculty'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className={`text-sm font-mono font-extrabold ${teacher.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {teacher.balance >= 0 ? '+' : ''}{teacher.balance}
              </div>
              <div className="text-[9px] text-slate-300 uppercase tracking-wider font-extrabold">Net Balance</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-sm font-mono font-extrabold text-emerald-300">+{totalEarned}</div>
              <div className="text-[9px] text-slate-300 uppercase tracking-wider font-extrabold">Earned</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-sm font-mono font-extrabold text-rose-300">-{totalDeducted}</div>
              <div className="text-[9px] text-slate-300 uppercase tracking-wider font-extrabold">Deducted</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/10">
              <div className="text-sm font-mono font-extrabold text-indigo-200">{teacherTxs.length}</div>
              <div className="text-[9px] text-slate-300 uppercase tracking-wider font-extrabold">Records</div>
            </div>
          </div>
        </div>

        {/* Credit Category Split */}
        {Object.keys(breakdown).length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Institutional Category Breakdown</h3>
            <div className="space-y-1.5">
              {Object.entries(breakdown).map(([cat, data]) => {
                const cfg = getCategoryConfig(cat)
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-xs shrink-0">{cfg.icon}</span>
                    <span className="text-xs font-semibold text-slate-700 min-w-[120px] truncate">{cfg.label}</span>
                    <div className="flex-1">
                      <BreakdownBar earned={data.earned} deducted={data.deducted} total={data.count} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">({data.count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-5 py-2.5 border-b border-slate-100 bg-white shrink-0 space-y-2">
          <div className="flex gap-1.5">
            {[['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateFilter(val)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  dateFilter === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setCategoryFilter(tab)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  categoryFilter === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Records Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredTxs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-xs font-bold text-slate-600">No records found matching filters</p>
            </div>
          ) : (
            filteredTxs.map((tx) => {
              const cat = getCategoryConfig(tx)
              const details = parseTransactionDetails(tx.reason, tx.category)
              const txDate = new Date(tx.created_at)

              return (
                <div key={tx.id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-indigo-200 transition-all shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{cat.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${cat.pillClass}`}>
                            {cat.label}
                          </span>
                          <CreditChange value={tx.change} />
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-1 leading-snug">{tx.reason}</p>
                        
                        {/* Context pills */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[10px]">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                            {txDate.toLocaleDateString('en-IN')} {txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {details.classText && (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                              {details.classText}
                            </span>
                          )}
                          {tx.related_leave_id && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">
                              Leave Request #{tx.related_leave_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                      #TX-{tx.id}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {onAdjust && (
          <div className="p-4 border-t border-slate-150 bg-slate-50/80 shrink-0">
            <button
              onClick={() => onAdjust(teacher)}
              className="w-full text-xs font-bold text-center text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
              + Adjust Faculty Credits
            </button>
          </div>
        )}
      </div>
    </>
  )
}
