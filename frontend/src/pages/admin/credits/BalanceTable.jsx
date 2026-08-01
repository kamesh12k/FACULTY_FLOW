import { useState, useMemo } from 'react'
import { avatarColors, initialsOf, getTeacherStatus, formatRelativeTime } from './utils'

function Avatar({ name }) {
  const c = avatarColors(name)
  return (
    <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${c.bg} ${c.text} shadow-xs`}>
      {initialsOf(name)}
    </div>
  )
}

function BalanceChip({ value }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
      +{value}
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-1 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs">
      {value}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200/80">
      0
    </span>
  )
}

function StatusBadge({ balance }) {
  const s = getTeacherStatus(balance)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${s.bgClass} ${s.textClass}`}>
      {s.label}
    </span>
  )
}

const SortIcon = ({ active, dir }) => (
  <span className={`ml-1 text-[10px] ${active ? 'text-indigo-600 font-bold' : 'text-slate-300'}`}>
    {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
  </span>
)

export default function BalanceTable({ report, transactions, onViewHistory, onAdjust }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | positive | negative | flagged
  const [selectedDept, setSelectedDept] = useState('')
  const [sortKey, setSortKey] = useState('balance')
  const [sortDir, setSortDir] = useState('desc')

  const departments = useMemo(() => {
    return Array.from(new Set(report.map(r => r.department).filter(Boolean))).sort()
  }, [report])

  const txByTeacher = useMemo(() => {
    const m = {}
    for (const tx of transactions) {
      if (!m[tx.teacher_id]) m[tx.teacher_id] = []
      m[tx.teacher_id].push(tx)
    }
    return m
  }, [transactions])

  const rows = useMemo(() => {
    return report.map((r) => {
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
    if (selectedDept) {
      out = out.filter(r => r.department === selectedDept)
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
  }, [rows, search, filter, selectedDept, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const TH = ({ label, sortable, col }) => (
    <th
      className={`px-4 py-3.5 text-left text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-slate-800 select-none' : ''}`}
      onClick={sortable ? () => toggleSort(col) : undefined}
    >
      {label}
      {sortable && <SortIcon active={sortKey === col} dir={sortDir} />}
    </th>
  )

  return (
    <div className="card overflow-hidden border border-slate-200/80 shadow-xs bg-white rounded-2xl">
      {/* Header & Controls Bar */}
      <div className="p-5 border-b border-slate-150 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>💳</span> Faculty Credit Balance Matrix
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Showing {filtered.length} of {report.length} faculty members
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                className="input py-1.5 px-3 text-xs font-semibold bg-white border-slate-200"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search teacher or dept..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-[11px] font-bold bg-slate-100/60 p-0.5">
              {[
                ['all', 'All'],
                ['positive', 'Positive (+)'],
                ['negative', 'Negative (-)'],
                ['flagged', 'Attention Required'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === val
                      ? 'bg-white text-indigo-700 font-extrabold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <p className="text-sm font-bold text-slate-600">No matching faculty members found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or department filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-150 text-slate-500">
              <tr>
                <TH label="#" />
                <TH label="Faculty Member" sortable col="name" />
                <TH label="Current Balance" sortable col="balance" />
                <TH label="Health Status" />
                <TH label="Last Activity" sortable col="lastActivity" />
                <TH label="Tx Count" sortable col="txCount" />
                <TH label="Quick Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, idx) => (
                <tr key={r.teacher_id} className="hover:bg-slate-50/80 transition-colors duration-150">
                  <td className="px-4 py-4 text-xs font-mono font-bold text-slate-400">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-snug">{r.name}</p>
                        <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-0.5">
                          {r.department || 'General Faculty'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BalanceChip value={r.balance} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge balance={r.balance} />
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                    {r.lastActivity ? formatRelativeTime(r.lastActivity) : 'No activity recorded'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      {r.txCount}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewHistory(r)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        History
                      </button>
                      <button
                        onClick={() => onAdjust(r)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
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
