import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { leavesApi } from '../../api/services'
import { Spinner, StatusBadge, EmptyState, Modal } from '../../components/ui'
import { PlusIcon, SearchIcon, FilterIcon, XCircleIcon } from '../../components/icons'

const PERIOD_TIMES = {
  1: '8:00–9:00',
  2: '9:00–10:00',
  3: '10:15–11:15',
  4: '11:15–12:15',
  5: '1:00–2:00',
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  try {
    const [y, m, d] = isoStr.split('-')
    if (!y || !m || !d) return isoStr
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return isoStr
  }
}

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [viewDetailTarget, setViewDetailTarget] = useState(null)
  const [disabledReasonModal, setDisabledReasonModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  // Filters & search
  const [statusFilter, setStatusFilter] = useState('all')
  const [dayOrderFilter, setDayOrderFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)

  const load = () => {
    setLoading(true)
    return leavesApi.myLeaves()
      .then(r => setLeaves(r.data))
      .catch(() => setError('Failed to load leave history.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCancel = async () => {
    if (!cancelTarget) return
    setActionLoading(cancelTarget.id)
    setError('')
    try {
      await leavesApi.cancel(cancelTarget.id)
      setCancelTarget(null)
      if (viewDetailTarget?.id === cancelTarget.id) setViewDetailTarget(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel leave.')
    } finally {
      setActionLoading(null)
    }
  }

  const getCancelability = (leave) => {
    if (!leave) return { allowed: false }
    if (leave.status === 'cancelled' || leave.status === 'rejected') {
      return { allowed: false }
    }
    const now = new Date()
    const leaveDate = new Date(leave.date + 'T00:00:00')
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (leaveDate < today) {
      return { allowed: false, reason: 'Past leaves cannot be cancelled.' }
    }
    if (leaveDate.getTime() === today.getTime()) {
      if (now.getHours() >= 10) {
        return {
          allowed: false,
          reason: 'Same-day leave cancellation is only available before 10:00 AM.',
        }
      }
    }
    return { allowed: true }
  }

  const counts = useMemo(() => {
    const total = leaves.length
    const approved = leaves.filter(l => l.status === 'approved').length
    const pending = leaves.filter(l => l.status === 'pending').length
    const rejected = leaves.filter(l => l.status === 'rejected').length
    const cancelled = leaves.filter(l => l.status === 'cancelled').length
    return { total, approved, pending, rejected, cancelled }
  }, [leaves])

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (dayOrderFilter !== 'all' && String(l.day_order) !== dayOrderFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          l.reason?.toLowerCase().includes(q) ||
          l.date?.includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          l.alter_assignment?.substitute?.name?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [leaves, statusFilter, dayOrderFilter, searchQuery])

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (dayOrderFilter !== 'all' ? 1 : 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* ── Top Bar / Primary Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track leave approval status, review timetable coverages, and manage cancellations.
          </p>
        </div>

        <Link
          to="/teacher/leave/apply"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs shrink-0 min-h-[42px]"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm text-rose-700 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-2">✕</button>
        </div>
      )}

      {/* ── Status Summary Counter Bar (Enterprise Tabs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { key: 'all', label: 'All Requests', count: counts.total, color: 'text-slate-900', border: 'hover:border-slate-300' },
          { key: 'pending', label: 'Pending', count: counts.pending, color: 'text-amber-700', border: 'hover:border-amber-300' },
          { key: 'approved', label: 'Approved', count: counts.approved, color: 'text-emerald-700', border: 'hover:border-emerald-300' },
          { key: 'rejected', label: 'Rejected', count: counts.rejected, color: 'text-rose-700', border: 'hover:border-rose-300' },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled, color: 'text-slate-600', border: 'hover:border-slate-300' },
        ].map(item => {
          const isActive = statusFilter === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : `bg-white border-slate-200 text-slate-700 ${item.border}`
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                {item.label}
              </span>
              <span className={`text-xl font-bold mt-1 block ${isActive ? 'text-white' : item.color}`}>
                {item.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Search & Filter Controls Strip ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by reason, date, or substitute teacher…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Day Order Filter */}
          <select
            value={dayOrderFilter}
            onChange={e => setDayOrderFilter(e.target.value)}
            className="hidden sm:block px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary-600"
          >
            <option value="all">All Day Orders</option>
            {[1, 2, 3, 4, 5, 6].map(d => (
              <option key={d} value={String(d)}>Day Order {d}</option>
            ))}
          </select>

          {/* Reset button if active */}
          {(statusFilter !== 'all' || dayOrderFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setDayOrderFilter('all'); setSearchQuery('') }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 transition"
            >
              Reset
            </button>
          )}

          {/* Mobile Filter Trigger */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Data View ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-12">
            <EmptyState message={leaves.length === 0 ? 'No leave requests yet.' : 'No leaves match the selected filters.'} />
          </div>
        ) : (
          <>
            {/* Desktop Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 select-none">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Date & Day Order</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Period / Time</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Reason</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Class Coverage</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px]">Applied On</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredLeaves.map(leave => {
                    const { allowed, reason: disabledReason } = getCancelability(leave)
                    const isTerminal = leave.status === 'cancelled' || leave.status === 'rejected'
                    const subTeacher = leave.alter_assignment?.substitute

                    return (
                      <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block text-xs">{formatDate(leave.date)}</span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            Day Order {leave.day_order}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">Period {leave.period_number}</span>
                          <span className="text-[10px] text-slate-400">{PERIOD_TIMES[leave.period_number] || ''}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="truncate text-slate-800" title={leave.reason}>{leave.reason}</p>
                          {leave.is_emergency && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                              Emergency
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={leave.status} />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {subTeacher ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200/80 rounded-lg">
                              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Cover:</span>
                              <span className="font-bold text-indigo-950 text-xs truncate max-w-[130px]" title={subTeacher.name}>
                                {subTeacher.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No substitute assigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {new Date(leave.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewDetailTarget(leave)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                            >
                              Details
                            </button>
                            {!isTerminal && (
                              allowed ? (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget(leave)}
                                  disabled={actionLoading !== null}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition disabled:opacity-40"
                                >
                                  Cancel
                                </button>
                              ) : disabledReason ? (
                                <button
                                  type="button"
                                  onClick={() => setDisabledReasonModal({ leave, reason: disabledReason })}
                                  className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 rounded transition"
                                  title={disabledReason}
                                >
                                  Info
                                </button>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (below md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredLeaves.map(leave => {
                const { allowed, reason: disabledReason } = getCancelability(leave)
                const isTerminal = leave.status === 'cancelled' || leave.status === 'rejected'
                const subTeacher = leave.alter_assignment?.substitute

                return (
                  <div key={leave.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm">{formatDate(leave.date)}</span>
                          <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            DO {leave.day_order}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Period {leave.period_number} · {PERIOD_TIMES[leave.period_number]}
                        </p>
                      </div>
                      <StatusBadge status={leave.status} />
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reason</span>
                      <p className="font-medium leading-relaxed">{leave.reason}</p>
                    </div>

                    {subTeacher && (
                      <div className="px-3 py-2 bg-indigo-50/70 border border-indigo-150 rounded-xl text-xs flex items-center justify-between">
                        <span className="text-indigo-900 font-bold">Assigned Substitute: {subTeacher.name}</span>
                        <span className="text-[10px] text-indigo-700">{subTeacher.department}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-slate-400">
                        Applied {new Date(leave.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewDetailTarget(leave)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          Details
                        </button>
                        {!isTerminal && allowed && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(leave)}
                            disabled={actionLoading !== null}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Filter Modal ── */}
      <Modal open={showFilterDrawer} onClose={() => setShowFilterDrawer(false)} title="Filter Leaves">
        <div className="space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Leave Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-left ${
                    statusFilter === s.id
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">Day Order</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDayOrderFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  dayOrderFilter === 'all' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                All Days
              </button>
              {[1, 2, 3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayOrderFilter(String(d))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                    dayOrderFilter === String(d) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Day Order {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setDayOrderFilter('all'); setSearchQuery('') }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Details Modal ── */}
      <Modal open={!!viewDetailTarget} onClose={() => setViewDetailTarget(null)} title="Leave Request Details">
        {viewDetailTarget && (
          <div className="space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-900">{formatDate(viewDetailTarget.date)}</p>
                <p className="text-xs text-slate-500">Day Order {viewDetailTarget.day_order} &middot; Period {viewDetailTarget.period_number} ({PERIOD_TIMES[viewDetailTarget.period_number]})</p>
              </div>
              <StatusBadge status={viewDetailTarget.status} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reason for Leave</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
                {viewDetailTarget.reason}
              </div>
            </div>
            {viewDetailTarget.alter_assignment && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">Assigned Substitute</span>
                <p className="text-xs font-bold text-indigo-950">
                  {viewDetailTarget.alter_assignment.substitute?.name || 'Substitute Teacher'}
                </p>
                {viewDetailTarget.alter_assignment.substitute?.department && (
                  <p className="text-[11px] text-indigo-700">
                    Department of {viewDetailTarget.alter_assignment.substitute.department}
                  </p>
                )}
              </div>
            )}
            <div className="text-xs text-slate-500 space-y-1">
              <p>Submitted: <strong className="text-slate-700">{new Date(viewDetailTarget.created_at).toLocaleString()}</strong></p>
              {viewDetailTarget.is_emergency && <p className="text-rose-600 font-bold">⚠️ Submitted as emergency leave</p>}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewDetailTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Close
              </button>
              {getCancelability(viewDetailTarget).allowed && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelTarget(viewDetailTarget)
                    setViewDetailTarget(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancellation Policy Info Modal ── */}
      <Modal open={!!disabledReasonModal} onClose={() => setDisabledReasonModal(null)} title="Cancellation Policy">
        {disabledReasonModal && (
          <div className="space-y-3 text-slate-700 text-xs">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed font-medium">
              {disabledReasonModal.reason}
            </div>
            <p className="text-slate-500">
              For emergency adjustments, please contact your Department Head (HOD) or Academic Administrator directly.
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDisabledReasonModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel Confirmation Modal ── */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Leave Request">
        {cancelTarget && (
          <div className="space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1">
              <p className="font-bold text-rose-900">Are you sure you want to cancel this leave?</p>
              <p className="text-rose-700 text-xs font-semibold">
                {formatDate(cancelTarget.date)} &middot; Day Order {cancelTarget.day_order} &middot; Period {cancelTarget.period_number}
              </p>
              <p className="text-rose-600 text-xs italic">"{cancelTarget.reason}"</p>
            </div>
            {cancelTarget.alter_assignment && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-0.5">
                <p className="font-bold">A substitute is currently assigned:</p>
                <p className="font-extrabold text-amber-950">{cancelTarget.alter_assignment.substitute?.name || 'Unknown'}</p>
                <p className="text-amber-700 text-[11px]">This substitute assignment will be released and credit adjustments will be reverted.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="text-xs px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
              >
                Keep Leave
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="text-xs px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 font-bold"
              >
                {actionLoading ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

