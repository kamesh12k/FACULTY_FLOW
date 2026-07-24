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
  else if (category === 'manual_adjustment') details.typeText = 'Manual Adjustment'
  else if (category === 'penalty') details.typeText = 'Absence Deduction'
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
    <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${c.bg} ${c.text} shadow-sm border border-gray-100`}>
      {initialsOf(name)}
    </div>
  )
}

function CreditChange({ value }) {
  if (value > 0) return <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">+{value}</span>
  return <span className="font-mono font-bold text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{value}</span>
}

function BreakdownBar({ earned, deducted, total }) {
  if (total === 0) return null
  const pct = Math.round((earned / (earned + deducted)) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-red-100 rounded overflow-hidden">
        <div className="h-full bg-emerald-500 rounded transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
    </div>
  )
}

const FILTER_TABS = ['All', 'Earned', 'Deducted', 'Substitute Class', 'Manual Adjustment', 'Correction']

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
    else if (categoryFilter === 'Substitute Class') out = out.filter(tx => tx.category === 'substitute_class')
    else if (categoryFilter === 'Manual Adjustment') out = out.filter(tx => tx.category === 'manual_adjustment')
    else if (categoryFilter === 'Correction') out = out.filter(tx => tx.category === 'correction')

    return out
  }, [teacherTxs, categoryFilter, dateFilter])

  const totalEarned = teacherTxs.filter(tx => tx.change > 0).reduce((s, tx) => s + tx.change, 0)
  const totalDeducted = Math.abs(teacherTxs.filter(tx => tx.change < 0).reduce((s, tx) => s + tx.change, 0))

  if (!teacher) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl flex flex-col transition-transform duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={teacher.name} />
              <div>
                <h2 className="text-sm font-bold text-gray-900">{teacher.name}</h2>
                <p className="text-xs text-gray-500">{teacher.department || 'Faculty'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="bg-white p-2 rounded border border-gray-100">
              <div className={`text-sm font-mono font-bold ${teacher.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {teacher.balance >= 0 ? '+' : ''}{teacher.balance}
              </div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Balance</div>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <div className="text-sm font-mono font-bold text-emerald-600">+{totalEarned}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Earned</div>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <div className="text-sm font-mono font-bold text-rose-600">-{totalDeducted}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Deducted</div>
            </div>
            <div className="bg-white p-2 rounded border border-gray-100">
              <div className="text-sm font-mono font-bold text-gray-700">{teacherTxs.length}</div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Events</div>
            </div>
          </div>
        </div>

        {/* Credit Breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/20 shrink-0">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Category Split</h3>
            <div className="space-y-1.5">
              {Object.entries(breakdown).map(([cat, data]) => {
                const cfg = getCategoryConfig(cat)
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass || 'bg-gray-400'}`} />
                    <span className="text-[11px] font-medium text-gray-600 min-w-[100px] truncate">{cfg.label}</span>
                    <div className="flex-1">
                      <BreakdownBar earned={data.earned} deducted={data.deducted} total={data.count} />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 shrink-0">({data.count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-5 py-2.5 border-b border-gray-100 bg-white shrink-0 space-y-2">
          <div className="flex gap-1">
            {[['all', 'All Time'], ['today', 'Today'], ['week', 'Week'], ['month', 'Month']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDateFilter(val)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${
                  dateFilter === val ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded transition-all ${
                  categoryFilter === tab ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredTxs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <p className="text-xs font-semibold">No records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTxs.map((tx) => {
                const cat = getCategoryConfig(tx.category || 'other')
                const details = parseTransactionDetails(tx.reason, tx.category)
                const txDate = new Date(tx.created_at)
                
                return (
                  <div key={tx.id} className="relative pl-5 border-l border-gray-100 last:border-l-0 pb-1">
                    <span className={`absolute left-[-4px] top-1.5 h-2 w-2 rounded-full ${cat.dotClass || 'bg-gray-400'} ring-4 ring-white`} />
                    
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CreditChange value={tx.change} />
                          <span className="text-[11px] font-bold text-gray-800">{details.typeText}</span>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tx.reason}</p>

                        {/* Detailed structured items */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-gray-400 font-medium bg-gray-50/50 p-2 rounded border border-gray-100/50">
                          <div>
                            <span className="text-gray-400">Date: </span>
                            <span className="text-gray-700 font-mono">{txDate.toLocaleDateString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Time: </span>
                            <span className="text-gray-700 font-mono">{txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {details.classText && (
                            <div>
                              <span className="text-gray-400">Class: </span>
                              <span className="text-gray-700">{details.classText}</span>
                            </div>
                          )}
                          {details.subject && (
                            <div>
                              <span className="text-gray-400">Subject: </span>
                              <span className="text-gray-700">{details.subject}</span>
                            </div>
                          )}
                          {details.dayOrder && (
                            <div>
                              <span className="text-gray-400">Schedule: </span>
                              <span className="text-gray-700">{details.dayOrder}</span>
                            </div>
                          )}
                          {details.period && (
                            <div>
                              <span className="text-gray-400">Period: </span>
                              <span className="text-gray-700">{details.period}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                          #{tx.id}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {onAdjust && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <button
              onClick={() => onAdjust(teacher)}
              className="w-full text-xs font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded transition-colors shadow-sm"
            >
              Adjust Faculty Credits
            </button>
          </div>
        )}
      </div>
    </>
  )
}

