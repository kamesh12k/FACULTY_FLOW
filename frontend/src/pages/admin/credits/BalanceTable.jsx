import { useState, useMemo } from 'react'
import { avatarColors, initialsOf, getTeacherStatus, formatRelativeTime } from './utils'

const STATUS_ORDER = { Critical: 0, 'Needs Attention': 1, Neutral: 2, Average: 3, Good: 4, Excellent: 5 }

function Avatar({ name }) {
  const c = avatarColors(name)
  return (
    <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${c.bg} ${c.text}`}>
      {initialsOf(name)}
    </div>
  )
}

function BalanceChip({ value }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 font-mono font-bold text-sm px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      +{value}
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 font-mono font-bold text-sm px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
      {value}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 font-mono font-bold text-sm px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      0
    </span>
  )
}

function StatusBadge({ balance }) {
  const s = getTeacherStatus(balance)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bgClass} ${s.textClass}`}>
      {s.label}
    </span>
  )
}

const SortIcon = ({ active, dir }) => (
  <span className={`ml-1 text-[10px] ${active ? 'text-indigo-600' : 'text-gray-300'}`}>
    {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
  </span>
)

export default function BalanceTable({ report, transactions, onViewHistory, onAdjust }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | positive | negative | flagged
  const [sortKey, setSortKey] = useState('balance')
  const [sortDir, setSortDir] = useState('desc')

  const txByTeacher = useMemo(() => {
    const m = {}
    for (const tx of transactions) {
      if (!m[tx.teacher_id]) m[tx.teacher_id] = []
      m[tx.teacher_id].push(tx)
    }
    return m
  }, [transactions])

  const rows = useMemo(() => {
    return report.map((r, i) => {
      const teacherTxs = txByTeacher[r.teacher_id] || []
      const lastTx = teacherTxs[0]
      return {
        ...r,
        txCount: teacherTxs.length,
        lastActivity: lastTx ? lastTx.created_at : null,
      }
    })
  }, [report, txByTeacher])

  const filtered = useMemo(() => {
    let out = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(r => r.name.toLowerCase().includes(q) || (r.department || '').toLowerCase().includes(q))
    }
    if (filter === 'positive') out = out.filter(r => r.balance > 0)
    else if (filter === 'negative') out = out.filter(r => r.balance < 0)
    else if (filter === 'flagged') {
      const status = getTeacherStatus
      out = out.filter(r => {
        const s = status(r.balance)
        return s.label === 'Critical' || s.label === 'Needs Attention'
      })
    }
    return [...out].sort((a, b) => {
      let av, bv
      if (sortKey === 'balance') { av = a.balance; bv = b.balance }
      else if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'txCount') { av = a.txCount; bv = b.txCount }
      else if (sortKey === 'lastActivity') { av = a.lastActivity ? new Date(a.lastActivity) : 0; bv = b.lastActivity ? new Date(b.lastActivity) : 0 }
      else { av = a.balance; bv = b.balance }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, search, filter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const TH = ({ label, sortable, col }) => (
    <th
      className={`px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
      onClick={sortable ? () => toggleSort(col) : undefined}
    >
      {label}
      {sortable && <SortIcon active={sortKey === col} dir={sortDir} />}
    </th>
  )

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">
              Credit Balance Directory
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{filtered.length} of {report.length} teachers shown</p>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search teachers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex rounded border border-gray-200 overflow-hidden text-[11px] font-medium bg-white">
            {[['all', 'All'], ['positive', 'Positive Balance'], ['negative', 'Negative Balance'], ['flagged', 'Requires Attention']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 transition-colors ${filter === val ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                <TH label="Rank" />
                <TH label="Teacher" sortable col="name" />
                <TH label="Balance" sortable col="balance" />
                <TH label="Status" />
                <TH label="Last Activity" sortable col="lastActivity" />
                <TH label="Transactions" sortable col="txCount" />
                <TH label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r, idx) => (
                <tr
                  key={r.teacher_id}
                  className="hover:bg-indigo-50/20 transition-colors duration-100 group"
                >
                  {/* Rank */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-mono font-bold text-gray-400">
                      #{idx + 1}
                    </span>
                  </td>

                  {/* Teacher */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{r.name}</div>
                        <div className="text-[11px] text-gray-400">{r.department || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-3.5">
                    <BalanceChip value={r.balance} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge balance={r.balance} />
                  </td>

                  {/* Last Activity */}
                  <td className="px-4 py-3.5 text-[12px] text-gray-500">
                    {r.lastActivity ? formatRelativeTime(r.lastActivity) : '—'}
                  </td>

                  {/* Tx Count */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {r.txCount}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onViewHistory(r)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
                      >
                        History
                      </button>
                      <button
                        onClick={() => onAdjust(r)}
                        className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
                      >
                        Adjust
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

