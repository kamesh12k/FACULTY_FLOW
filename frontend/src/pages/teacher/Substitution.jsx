import { useEffect, useState } from 'react'
import { teacherSubstitutionApi, leavesApi } from '../../api/services'
import { Spinner, Modal, EmptyState, AssignmentTypeBadge, ErrorAlert } from '../../components/ui'
import { AlertTriangleIcon, SwapIcon, UndoIcon, SettingsIcon } from '../../components/icons'

function ScoreBar({ score }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-500' : 'bg-gray-400'
  return (
    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden shrink-0">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  )
}

function RecommendationRow({ rec, onAssign, disabled, isOverride }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800 truncate">{rec.teacher.name}</p>
          <span className="text-xs font-semibold text-gray-500 shrink-0">{rec.score}% match</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ScoreBar score={rec.score} />
          <p className="text-xs text-gray-400 truncate">{rec.reasons.join(' · ') || 'No strong signals'}</p>
        </div>
      </div>
      <button
        onClick={() => onAssign(rec.teacher.id)}
        disabled={disabled}
        className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shrink-0 font-medium"
      >
        {disabled ? '…' : isOverride ? 'Reassign' : 'Assign'}
      </button>
    </div>
  )
}

export default function TeacherSubstitution() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myLeaves, setMyLeaves] = useState([])
  const [activeCoverLeaves, setActiveCoverLeaves] = useState([])
  const [activeTab, setActiveTab] = useState('needs-cover')
  const [assignModal, setAssignModal] = useState(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    try {
      const enabledRes = await teacherSubstitutionApi.enabled()
      setEnabled(enabledRes.data.teachers_mode_enabled)
      
      if (enabledRes.data.teachers_mode_enabled) {
        const [{ data: needsCover }, { data: allMyLeaves }] = await Promise.all([
          teacherSubstitutionApi.myLeaves(),
          leavesApi.myLeaves()
        ])
        setMyLeaves(needsCover)
        setActiveCoverLeaves(allMyLeaves.filter(l => l.status === 'approved' && l.alter_assignment))
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load substitution data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAssignModal = async (leave, isOverride = false) => {
    setActionLoading(leave.id + '_load_candidates')
    try {
      const { data: recommendations } = await teacherSubstitutionApi.candidates(leave.id)
      setAssignModal({ leave, recommendations, isOverride })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load candidates.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignSubstitute = async (substituteId) => {
    const leaveId = assignModal.leave.id
    setActionLoading('assign')
    try {
      if (assignModal.isOverride) {
        await teacherSubstitutionApi.override(leaveId, substituteId)
      } else {
        await teacherSubstitutionApi.assign(leaveId, substituteId)
      }
      setAssignModal(null)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign substitute.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClearAllAssignments = async () => {
    setActionLoading('clear_all')
    try {
      await teacherSubstitutionApi.clearAllAssignments()
      setConfirmClearOpen(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clear assignments.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPreferences = async () => {
    setActionLoading('reset_prefs')
    try {
      await teacherSubstitutionApi.resetPreferences()
      setConfirmResetOpen(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset preferences.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  if (!enabled) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertTriangleIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Teachers Mode Disabled</h2>
            <p className="text-sm text-gray-500 mt-1">
              Your institution is currently in Manual or Full Autonomous workflow mode. 
              Self-guided teacher substitutions are disabled.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manage Substitutes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Assign and override substitutes for your own approved leaves</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setConfirmResetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Reset Preferences
          </button>
          <button
            onClick={() => setConfirmClearOpen(true)}
            disabled={activeCoverLeaves.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <UndoIcon className="w-3.5 h-3.5" />
            Clear All Assignments
          </button>
        </div>
      </div>

      <ErrorAlert message={error} />

      {/* Tabs */}
      <div className="border-b border-gray-100 flex gap-4">
        <button
          onClick={() => setActiveTab('needs-cover')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'needs-cover'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Needs Cover ({myLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab('assigned-cover')}
          className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'assigned-cover'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Assigned Cover ({activeCoverLeaves.length})
        </button>
      </div>

      <div className="card overflow-hidden">
        {activeTab === 'needs-cover' ? (
          myLeaves.length === 0 ? (
            <EmptyState message="No approved leaves needing substitutes right now." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Day Order', 'Period', 'Reason', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-800">{leave.date}</td>
                    <td className="px-5 py-3 text-gray-500">DO {leave.day_order}</td>
                    <td className="px-5 py-3 text-gray-500">P{leave.period_number}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {leave.is_emergency && <AlertTriangleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        {leave.reason}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(leave, false)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition-colors ml-auto"
                      >
                        <SwapIcon className="w-3 h-3" />
                        {actionLoading === leave.id + '_load_candidates' ? 'Loading…' : 'Assign Sub'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )
        ) : (
          activeCoverLeaves.length === 0 ? (
            <EmptyState message="No substitute covers assigned yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Day Order', 'Period', 'Assigned Substitute', 'Type', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeCoverLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-800">{leave.date}</td>
                    <td className="px-5 py-3 text-gray-500">DO {leave.day_order}</td>
                    <td className="px-5 py-3 text-gray-500">P{leave.period_number}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">{leave.alter_assignment.substitute?.name}</td>
                    <td className="px-5 py-3">
                      <AssignmentTypeBadge type={leave.alter_assignment.assignment_type} small />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(leave, true)}
                        disabled={!!actionLoading}
                        className="text-xs text-primary-600 hover:text-primary-800 font-medium ml-auto"
                      >
                        {actionLoading === leave.id + '_load_candidates' ? 'Loading…' : 'Change Cover'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )
        )}
      </div>

      {/* Assign/Override Candidates Modal */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={assignModal?.isOverride ? "Change Substitute Assignment" : "Assign Substitute Candidate"}
      >
        {assignModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 text-gray-600">
              <p><span className="font-semibold text-gray-700">Date:</span> {assignModal.leave.date} (Day Order {assignModal.leave.day_order})</p>
              <p><span className="font-semibold text-gray-700">Period:</span> Period {assignModal.leave.period_number}</p>
              <p><span className="font-semibold text-gray-700">Reason:</span> {assignModal.leave.reason}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700">Compatible Candidates</h4>
              {assignModal.recommendations.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No compatible candidates found for this slot.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {assignModal.recommendations.map(rec => (
                    <RecommendationRow
                      key={rec.teacher.id}
                      rec={rec}
                      onAssign={handleAssignSubstitute}
                      disabled={actionLoading === 'assign'}
                      isOverride={assignModal.isOverride}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAssignModal(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Clear All Modal */}
      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear all assignments?"
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Are you sure you want to remove all substitute coverage assignments from your leaves? 
            This will:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Delete all covers currently assigned to your approved leaves</li>
            <li>Revert all credit transactions for both you and your substitutes</li>
            <li>Return your leaves to "Needs Cover" status</li>
          </ul>
          <p className="text-xs text-red-500 font-medium">This action cannot be undone.</p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmClearOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAllAssignments}
              disabled={actionLoading === 'clear_all'}
              className="btn-danger flex-1"
            >
              {actionLoading === 'clear_all' ? 'Clearing…' : 'Clear All'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Reset Preferences Modal */}
      <Modal
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Reset substitution preferences?"
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Are you sure you want to reset all your substitution preferences? 
            This will immediately:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Turn off auto-assignments and emergency assignments</li>
            <li>Reset morning and same-department nudges to off</li>
            <li>Set your weekly substitution cap back to 5</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmResetOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPreferences}
              disabled={actionLoading === 'reset_prefs'}
              className="btn-primary flex-1"
            >
              {actionLoading === 'reset_prefs' ? 'Resetting…' : 'Reset'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
