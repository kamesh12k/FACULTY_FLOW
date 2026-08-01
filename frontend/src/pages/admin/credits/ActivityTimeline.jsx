import { useState, useMemo } from 'react'
import { groupTransactionsByDate, getCategoryConfig, formatRelativeTime } from './utils'

function parseReasonDetails(reasonText) {
  const result = {
    classText: null,
    dayOrder: null,
    period: null
  }
  if (!reasonText) return result
  
  // Extract Day Order
  const doMatch = reasonText.match(/Day Order\s+(\d+)/i) || reasonText.match(/DO\s*(\d+)/i)
  if (doMatch) {
    result.dayOrder = `Day Order ${doMatch[1]}`
  }
  
  // Extract Period
  const pMatch = reasonText.match(/period\s+(\d+)/i) || reasonText.match(/P\s*(\d+)/i)
  if (pMatch) {
    result.period = `Period ${pMatch[1]}`
  }
  
  // Extract Class (e.g. "III BCA", "II B.Sc CS A")
  const classMatch = reasonText.match(/in\s+([I|V|X\d\s\w\.\-]+?)(?:\s+Period|\s+Day|\s+DO|$)/i) ||
                     reasonText.match(/for\s+([I|V|X\d\s\w\.\-]+?)(?:\s+Period|\s+Day|\s+DO|$)/i)
  if (classMatch && !classMatch[1].toLowerCase().includes('teacher') && !classMatch[1].toLowerCase().includes('leave')) {
    result.classText = classMatch[1].trim()
  }
  
  return result
}

function CreditChangePill({ value }) {
  if (value > 0) return (
    <span className="font-mono font-extrabold text-xs text-emerald-700 bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
      +{value} Credit{value > 1 ? 's' : ''}
    </span>
  )
  return (
    <span className="font-mono font-extrabold text-xs text-rose-700 bg-rose-100 border border-rose-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
      {value} Credit{Math.abs(value) > 1 ? 's' : ''}
    </span>
  )
}

function AuditRecordCard({ tx, teacherName }) {
  const cat = getCategoryConfig(tx)
  const details = parseReasonDetails(tx.reason)

  return (
    <div className="p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all duration-150 group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Left: Icon, Category Pill, Teacher & Details */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.bgClass} shadow-2xs text-lg`}>
            {cat.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cat.pillClass}`}>
                {cat.label}
              </span>
              <CreditChangePill value={tx.change} />
              {tx.related_leave_id && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-md">
                  Ref: Leave Request #{tx.related_leave_id}
                </span>
              )}
            </div>

            <p className="text-sm font-extrabold text-slate-900 leading-snug truncate">
              {teacherName}
            </p>

            {tx.reason && (
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                {tx.reason}
              </p>
            )}

            {/* Context Pills (Class, Day Order, Period) */}
            {(details.classText || details.dayOrder || details.period) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {details.classText && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200/60">
                    Class: {details.classText}
                  </span>
                )}
                {details.dayOrder && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100">
                    {details.dayOrder}
                  </span>
                )}
                {details.period && (
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-100">
                    {details.period}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Timestamp & Ref ID */}
        <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-xs font-semibold text-slate-500">{formatRelativeTime(tx.created_at)}</div>
          <div className="text-[10px] font-mono text-slate-400 font-medium mt-0.5">Record ID #TX-{tx.id}</div>
        </div>
      </div>
    </div>
  )
}

function GroupSection({ title, items, teacherMap, showBadge }) {
  if (items.length === 0) return null
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
          {showBadge && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          {title}
          <span className="font-bold text-slate-400 font-mono text-[11px]">({items.length} records)</span>
        </span>
        <div className="h-px flex-1 bg-slate-200/80" />
      </div>
      <div className="space-y-2.5">
        {items.map(tx => (
          <AuditRecordCard key={tx.id} tx={tx} teacherName={teacherMap[tx.teacher_id] || `Teacher #${tx.teacher_id}`} />
        ))}
      </div>
    </div>
  )
}

const ALL_FILTER_TABS = [
  { id: 'all', label: 'All Records', icon: '📋' },
  { id: 'substitute_class', label: '🔄 Substitutions', icon: '🔄' },
  { id: 'leave_deduction', label: '🏖️ Leaves Taken', icon: '🏖️' },
  { id: 'exam_duty', label: '📝 Exam Duties', icon: '📝' },
  { id: 'department_duty', label: '🏛️ Dept. Duties', icon: '🏛️' },
  { id: 'manual_adjustment', label: '⚙️ Admin Adjustments', icon: '⚙️' },
  { id: 'penalty', label: '📉 Penalties', icon: '📉' },
]

export default function ActivityTimeline({ transactions, report }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [showCount, setShowCount] = useState(50)

  const teacherMap = useMemo(() => {
    const m = {}
    for (const r of report) m[r.teacher_id] = r.name
    return m
  }, [report])

  // Compute accounting metrics across all transactions
  const ledgerMetrics = useMemo(() => {
    let creditsEarned = 0
    let creditsDeducted = 0
    for (const tx of transactions) {
      if (tx.change > 0) creditsEarned += tx.change
      else creditsDeducted += Math.abs(tx.change)
    }
    const netBalance = creditsEarned - creditsDeducted
    return { creditsEarned, creditsDeducted, netBalance }
  }, [transactions])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return transactions
    return transactions.filter(tx => {
      const cat = getCategoryConfig(tx)
      if (activeFilter === 'substitute_class') return cat.label.includes('Substitution')
      if (activeFilter === 'leave_deduction') return cat.label.includes('Leave')
      if (activeFilter === 'exam_duty') return cat.label.includes('Exam')
      if (activeFilter === 'department_duty') return cat.label.includes('Department')
      if (activeFilter === 'manual_adjustment') return cat.label.includes('Admin')
      if (activeFilter === 'penalty') return cat.label.includes('Penalty')
      return tx.category === activeFilter
    })
  }, [transactions, activeFilter])

  const visible = filtered.slice(0, showCount)
  const groups = groupTransactionsByDate(visible)

  const earlierItems = useMemo(() => {
    return [...(groups.thisWeek || []), ...(groups.earlier || [])]
  }, [groups])

  return (
    <div className="space-y-6">

      {/* ── Institutional Ledger Accounting Summary ── */}
      <div className="card p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800/50">
              Institutional Accounting Ledger
            </span>
            <h2 className="text-lg font-extrabold tracking-tight mt-2 text-white flex items-center gap-2">
              <span>🧾</span> Transaction Audit Stream
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Audited transaction records for payroll accounting and leave reconciliation
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-center px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issued (+)</span>
              <span className="block text-base font-extrabold font-mono text-emerald-400 mt-0.5">+{ledgerMetrics.creditsEarned}</span>
            </div>
            <div className="text-center px-2 border-x border-slate-800">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deducted (-)</span>
              <span className="block text-base font-extrabold font-mono text-rose-400 mt-0.5">-{ledgerMetrics.creditsDeducted}</span>
            </div>
            <div className="text-center px-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Circ.</span>
              <span className={`block text-base font-extrabold font-mono mt-0.5 ${ledgerMetrics.netBalance >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                {ledgerMetrics.netBalance >= 0 ? `+${ledgerMetrics.netBalance}` : ledgerMetrics.netBalance}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
          {ALL_FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id); setShowCount(50) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Transaction Records List ── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-extrabold text-slate-700">No accounting records found</p>
            <p className="text-xs text-slate-400 mt-1">There are no transaction entries matching the selected filter.</p>
          </div>
        ) : (
          <div>
            <GroupSection title="Today's Audit Trail" items={groups.today} teacherMap={teacherMap} showBadge />
            <GroupSection title="Yesterday's Audit Trail" items={groups.yesterday} teacherMap={teacherMap} />
            <GroupSection title="Historical Audit Records" items={earlierItems} teacherMap={teacherMap} />

            {filtered.length > showCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowCount(c => c + 50)}
                  className="px-6 py-2.5 text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-xs"
                >
                  Load more accounting records ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
