import { useEffect, useState } from 'react'
import { leavesApi } from '../../api/services'
import { Spinner, StatusBadge, EmptyState, Modal } from '../../components/ui'
import { XCircleIcon } from '../../components/icons'

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const load = () => leavesApi.myLeaves().then(r => setLeaves(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleCancel = async () => {
    if (!cancelTarget) return
    setActionLoading(cancelTarget.id)
    setError('')
    try {
      await leavesApi.cancel(cancelTarget.id)
      setCancelTarget(null)
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
    if (leave.status === 'cancelled' || leave.status === 'rejected') {
      return { allowed: false }
    }

    const now = new Date()
    const leaveDate = new Date(leave.date + 'T00:00:00')
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Past date
    if (leaveDate < today) {
      return { allowed: false }
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Leave History</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : leaves.length === 0 ? <EmptyState message="No leave requests yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Day Order', 'Period', 'Reason', 'Status', 'Submitted', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaves.map(leave => {
                const { allowed, reason: disabledReason } = getCancelability(leave)
                const isTerminal = leave.status === 'cancelled' || leave.status === 'rejected'

                return (
                  <tr key={leave.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-800">{leave.date}</td>
                    <td className="px-5 py-3 text-gray-500">DO {leave.day_order}</td>
                    <td className="px-5 py-3 text-gray-500">P{leave.period_number}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{leave.reason}</td>
                    <td className="px-5 py-3"><StatusBadge status={leave.status} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(leave.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      {!isTerminal && (
                        allowed ? (
                          <button
                            onClick={() => setCancelTarget(leave)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        ) : disabledReason ? (
                          <div className="group relative">
                            <button
                              disabled
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 text-gray-300 rounded-lg cursor-not-allowed font-medium"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-20 w-64 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-lg">
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

      {/* Cancel Confirmation Modal */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Leave Request">
        {cancelTarget && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
              <p className="font-semibold text-red-800">Are you sure you want to cancel this leave?</p>
              <p className="text-red-600 text-xs mt-1">
                {cancelTarget.date} &middot; Day Order {cancelTarget.day_order} &middot; Period {cancelTarget.period_number}
              </p>
              <p className="text-red-500 text-xs mt-1 italic">"{cancelTarget.reason}"</p>
            </div>

            {cancelTarget.alter_assignment && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold">A substitute is currently assigned:</p>
                <p className="mt-0.5">{cancelTarget.alter_assignment.substitute?.name || 'Unknown'}</p>
                <p className="text-amber-600 mt-1">This assignment will be automatically removed and credits will be reversed.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                className="text-xs px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Leave
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="text-xs px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
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
