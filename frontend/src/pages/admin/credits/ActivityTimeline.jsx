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

function CreditChange({ value }) {
  if (value > 0) return <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">+{value}</span>
  return <span className="font-mono font-bold text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">{value}</span>
}

function TimelineItem({ tx, teacherName }) {
  const cat = getCategoryConfig(tx.category || 'other')
  const details = parseReasonDetails(tx.reason)

  return (
    <div className="flex gap-3 py-3">
      {/* Icon column */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cat.bgClass} border ${cat.borderClass} shadow-sm`}>
          <span className="text-sm leading-none">{cat.icon}</span>
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <CreditChange value={tx.change} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cat.bgClass} ${cat.textClass}`}>
                {cat.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {teacherName}
            </p>
            {tx.reason && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{tx.reason}</p>
            )}

            {/* Class, Day Order, Period pill tags */}
            {(details.classText || details.dayOrder || details.period) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {details.classText && (
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium border border-gray-200/50">
                    Class: {details.classText}
                  </span>
                )}
                {details.dayOrder && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium border border-indigo-100/50">
                    {details.dayOrder}
                  </span>
                )}
                {details.period && (
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-medium border border-purple-100/50">
                    {details.period}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-gray-400">{formatRelativeTime(tx.created_at)}</div>
            <div className="text-[10px] text-gray-300 mt-0.5">ID #{tx.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GroupSection({ title, items, teacherMap, showBadge }) {
  if (items.length === 0) return null
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-2 flex items-center gap-1">
          {showBadge && (
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          )}
          {title}
          <span className="font-normal text-gray-400">({items.length})</span>
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(tx => (
          <TimelineItem key={tx.id} tx={tx} teacherName={teacherMap[tx.teacher_id] || `Teacher #${tx.teacher_id}`} />
        ))}
      </div>
    </div>
  )
}

const ALL_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'substitute_class', label: 'Substitute' },
  { id: 'manual_adjustment', label: 'Manual' },
  { id: 'exam_duty', label: 'Exam Duty' },
  { id: 'department_duty', label: 'Dept. Duty' },
  { id: 'penalty', label: 'Penalty' },
  { id: 'correction', label: 'Correction' },
]

export default function ActivityTimeline({ transactions, report }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [showCount, setShowCount] = useState(50)

  const teacherMap = useMemo(() => {
    const m = {}
    for (const r of report) m[r.teacher_id] = r.name
    return m
  }, [report])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return transactions
    return transactions.filter(tx => (tx.category || 'other') === activeFilter)
  }, [transactions, activeFilter])

  const visible = filtered.slice(0, showCount)
  const groups = groupTransactionsByDate(visible)

  // Merge thisWeek and earlier into a single "Earlier" group
  const earlierItems = useMemo(() => {
    return [...(groups.thisWeek || []), ...(groups.earlier || [])]
  }, [groups])

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Activity Timeline
          </h2>
          <span className="text-[11px] text-gray-500">
            Showing {visible.length} of {filtered.length} events
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {ALL_FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id); setShowCount(50) }}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-all ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">No activity recorded</p>
            <p className="text-xs text-gray-400 mt-0.5">There are no transactions matching this filter.</p>
          </div>
        ) : (
          <div>
            <GroupSection title="Today" items={groups.today} teacherMap={teacherMap} showBadge />
            <GroupSection title="Yesterday" items={groups.yesterday} teacherMap={teacherMap} />
            <GroupSection title="Earlier" items={earlierItems} teacherMap={teacherMap} />

            {filtered.length > showCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowCount(c => c + 50)}
                  className="px-5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors"
                >
                  Load more ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
