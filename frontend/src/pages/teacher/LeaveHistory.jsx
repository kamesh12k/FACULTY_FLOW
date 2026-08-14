import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { leavesApi } from '../../api/services'
import { Spinner, StatusBadge, EmptyState, Modal } from '../../components/ui'
import { XCircleIcon, PlusIcon, SearchIcon, FilterIcon, DocIcon } from '../../components/icons'

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

  // Mobile filters & search
  const [statusFilter, setStatusFilter] = useState('all')
  const [dayOrderFilter, setDayOrderFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)

  const load = () => leavesApi.myLeaves().then(r => setLeaves(r.data)).finally(() => setLoading(false))
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

  /**
   * Determine if the teacher can cancel this leave right now.
   * Returns { allowed: boolean, reason?: string }
   */
  const getCancelability = (leave) => {
    if (!leave) return { allowed: false }
    if (leave.status === 'cancelled' || leave.status === 'rejected') {
      return { allowed: false }
    }

    const now = new Date()
    const leaveDate = new Date(leave.date + 'T00:00:00')
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Past date
    if (leaveDate < today) {
      return { allowed: false, reason: 'Past leaves cannot be cancelled.' }
    }

    // Same day — check 10 AM cutoff
    if (leaveDate.getTime() === today.getTime()) {
      if (now.getHours() >= 10) {
        return {
          allowed: false,
          reason: 'Same-day leave cancellation is only available before 10:00 AM. Please contact an administrator.',
        }
      }
    }

    return { allowed: true }
  }

  // Summary counts
  const counts = useMemo(() => {
    const total = leaves.length
    const approved = leaves.filter(l => l.status === 'approved').length
    const pending = leaves.filter(l => l.status === 'pending').length
    const rejected = leaves.filter(l => l.status === 'rejected').length
    const cancelled = leaves.filter(l => l.status === 'cancelled').length
    return { total, approved, pending, rejected, cancelled }
  }, [leaves])

  // Filtered leaves for mobile
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (dayOrderFilter !== 'all' && String(l.day_order) !== dayOrderFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchReason = l.reason?.toLowerCase().includes(q)
        const matchDate = l.date?.includes(q)
        const matchStatus = l.status?.toLowerCase().includes(q)
        const matchSub = l.alter_assignment?.substitute?.name?.toLowerCase().includes(q)
        if (!matchReason && !matchDate && !matchStatus && !matchSub) return false
      }
      return true
    })
  }, [leaves, statusFilter, dayOrderFilter, searchQuery])

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (dayOrderFilter !== 'all' ? 1 : 0)

  return (
    <div className="space-y-5 pb-24 lg:pb-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Leave History</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Review past applications, track approval status, and manage cancellations.
          </p>
        </div>
        <Link
          to="/teacher/leave/apply"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shadow-primary-500/20 shrink-0 min-h-[44px]"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Apply for Leave</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs sm:text-sm text-rose-700 font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-2">✕</button>
        </div>
      )}

      {/* ── Mobile Summary Statistics Cards (Scrollable / Grid) ── */}
      <div className="block lg:hidden">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] ${
              statusFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>Total</span>
            <span className="text-base font-extrabold mt-0.5 block">{counts.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
            className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50/50'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-emerald-600'}`}>Approved</span>
            <span className="text-base font-extrabold mt-0.5 block">{counts.approved}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] ${
              statusFilter === 'pending'
                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50/50'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-600'}`}>Pending</span>
            <span className="text-base font-extrabold mt-0.5 block">{counts.pending}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
            className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] col-span-1 sm:col-span-1 ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-rose-700 hover:bg-rose-50/50'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${statusFilter === 'rejected' ? 'text-rose-100' : 'text-rose-600'}`}>Rejected</span>
            <span className="text-base font-extrabold mt-0.5 block">{counts.rejected}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
            className={`p-2.5 rounded-xl border text-left transition-all min-h-[58px] col-span-2 sm:col-span-1 ${
              statusFilter === 'cancelled'
                ? 'bg-slate-600 border-slate-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${statusFilter === 'cancelled' ? 'text-slate-200' : 'text-slate-500'}`}>Cancelled</span>
            <span className="text-base font-extrabold mt-0.5 block">{counts.cancelled}</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reason or date…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold min-h-[44px] shrink-0 transition-colors ${
              activeFiltersCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter leaves"
          >
            <FilterIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Desktop View (lg and up) ── */}
      <div className="hidden lg:block card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : leaves.length === 0 ? (
          <EmptyState message="No leave requests yet." />
        ) : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  {['Date', 'Day Order', 'Period', 'Reason', 'Status', 'Submitted', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map(leave => {
                  const { allowed, reason: disabledReason } = getCancelability(leave)
                  const isTerminal = leave.status === 'cancelled' || leave.status === 'rejected'

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{leave.date}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-semibold">DO {leave.day_order}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-semibold">
                        P{leave.period_number} <span className="text-[11px] text-slate-400 font-normal">({PERIOD_TIMES[leave.period_number]})</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={leave.status} /></td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{new Date(leave.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!isTerminal && (
                          allowed ? (
                            <button
                              onClick={() => setCancelTarget(leave)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50 font-bold cursor-pointer"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          ) : disabledReason ? (
                            <div className="group relative inline-block">
                              <button
                                disabled
                                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-slate-200 text-slate-300 rounded-lg cursor-not-allowed font-medium"
                              >
                                <XCircleIcon className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                              <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-20 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg">
                                {disabledReason}
                              </div>
                            </div>
                          ) : null
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile View: Native Card List (below lg) ── */}
      <div className="block lg:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filteredLeaves.length === 0 ? (
          <div className="card p-6 text-center">
            <DocIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {leaves.length === 0 ? 'No leave requests yet.' : 'No leaves match the selected filters.'}
            </p>
            {leaves.length > 0 && (
              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setDayOrderFilter('all'); setSearchQuery('') }}
                className="mt-3 text-xs font-bold text-primary-600 hover:text-primary-700 underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filteredLeaves.map(leave => {
            const { allowed, reason: disabledReason } = getCancelability(leave)
            const isTerminal = leave.status === 'cancelled' || leave.status === 'rejected'
            const substituteName = leave.alter_assignment?.substitute?.name

            return (
              <div
                key={leave.id}
                className="card p-4 border border-slate-200/80 bg-white rounded-2xl shadow-xs space-y-3 transition-all"
              >
                {/* Card Top: Date & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">{formatDate(leave.date)}</span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        DO {leave.day_order}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      Period {leave.period_number} &nbsp;·&nbsp; {PERIOD_TIMES[leave.period_number]}
                    </p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>

                {/* Card Body: Reason */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-150">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reason</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed break-words">
                    {leave.reason}
                  </p>
                </div>

                {/* Substitute Assigned Banner (if applicable) */}
                {substituteName && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50/70 border border-indigo-150 rounded-xl text-xs">
                    <span className="font-bold text-indigo-900 truncate">
                      Substitute: {substituteName}
                    </span>
                    {leave.alter_assignment?.is_locked && (
                      <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-800 px-1.5 py-0.5 rounded">Locked</span>
                    )}
                  </div>
                )}

                {/* Card Footer: Metadata & Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Applied {new Date(leave.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewDetailTarget(leave)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors min-h-[38px]"
                    >
                      Details
                    </button>

                    {!isTerminal && (
                      allowed ? (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(leave)}
                          disabled={actionLoading !== null}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors min-h-[38px]"
                        >
                          Cancel
                        </button>
                      ) : disabledReason ? (
                        <button
                          type="button"
                          onClick={() => setDisabledReasonModal({ leave, reason: disabledReason })}
                          className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 min-h-[38px]"
                          title="Cancellation policy"
                        >
                          Cannot Cancel ℹ️
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Mobile Filter Modal / Drawer ── */}
      <Modal open={showFilterDrawer} onClose={() => setShowFilterDrawer(false)} title="Filter Leaves">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Leave Status</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'approved', label: 'Approved' },
                { id: 'pending', label: 'Pending' },
                { id: 'rejected', label: 'Rejected' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                    statusFilter === s.id
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Day Order</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDayOrderFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  dayOrderFilter === 'all' ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-700'
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
                    dayOrderFilter === String(d) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  DO {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setDayOrderFilter('all'); setSearchQuery('') }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setShowFilterDrawer(false)}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold min-h-[44px]"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Details Modal (Mobile / Responsive) ── */}
      <Modal open={!!viewDetailTarget} onClose={() => setViewDetailTarget(null)} title="Leave Request Details">
        {viewDetailTarget && (
          <div className="space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-base font-extrabold text-slate-900">{formatDate(viewDetailTarget.date)}</p>
                <p className="text-xs text-slate-500">Day Order {viewDetailTarget.day_order} &nbsp;·&nbsp; Period {viewDetailTarget.period_number} ({PERIOD_TIMES[viewDetailTarget.period_number]})</p>
              </div>
              <StatusBadge status={viewDetailTarget.status} />
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Reason for Leave</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed font-semibold text-slate-800">
                {viewDetailTarget.reason}
              </div>
            </div>

            {viewDetailTarget.alter_assignment && (
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-150 rounded-xl space-y-1">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">Assigned Substitute</span>
                <p className="text-sm font-extrabold text-indigo-950">
                  {viewDetailTarget.alter_assignment.substitute?.name || 'Substitute Teacher'}
                </p>
                <p className="text-xs text-indigo-700">
                  {viewDetailTarget.alter_assignment.substitute?.department ? `Department of ${viewDetailTarget.alter_assignment.substitute.department}` : ''}
                </p>
              </div>
            )}

            <div className="text-xs text-slate-500 space-y-1 pt-1">
              <p>Applied on: <strong className="text-slate-700">{new Date(viewDetailTarget.created_at).toLocaleString()}</strong></p>
              {viewDetailTarget.is_emergency && <p className="text-rose-600 font-bold">⚠️ Submitted as Emergency Leave</p>}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewDetailTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold min-h-[44px]"
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
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold min-h-[44px]"
                >
                  Cancel This Leave
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cancel Disabled Reason Explainer Modal ── */}
      <Modal open={!!disabledReasonModal} onClose={() => setDisabledReasonModal(null)} title="Cancellation Policy">
        {disabledReasonModal && (
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
              {disabledReasonModal.reason}
            </div>
            <p className="text-xs text-slate-500">
              For emergency modifications, please contact your Department Head (HOD) or Academic Administrator.
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDisabledReasonModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold min-h-[44px]"
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
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-150 rounded-xl p-3.5 text-xs sm:text-sm">
              <p className="font-extrabold text-rose-900">Are you sure you want to cancel this leave?</p>
              <p className="text-rose-700 text-xs mt-1 font-semibold">
                {formatDate(cancelTarget.date)} &middot; Day Order {cancelTarget.day_order} &middot; Period {cancelTarget.period_number}
              </p>
              <p className="text-rose-600 text-xs mt-1 italic">"{cancelTarget.reason}"</p>
            </div>

            {cancelTarget.alter_assignment && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                <p className="font-bold">A substitute is currently assigned:</p>
                <p className="font-extrabold text-amber-950 mt-0.5">{cancelTarget.alter_assignment.substitute?.name || 'Unknown'}</p>
                <p className="text-amber-700 text-[11px] mt-1">This substitute assignment will be revoked and credits will be automatically recalculated.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="text-xs px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold min-h-[44px]"
              >
                Keep Leave
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="text-xs px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 font-bold min-h-[44px]"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

