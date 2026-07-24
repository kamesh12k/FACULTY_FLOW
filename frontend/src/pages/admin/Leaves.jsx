import { useEffect, useState, useMemo } from 'react'
import { leavesApi, adminApi } from '../../api/services'
import { Spinner, StatusBadge, Modal, EmptyState, AssignmentTypeBadge } from '../../components/ui'
import { SwapIcon, LockIcon, UnlockIcon, UndoIcon, SparklesIcon, AlertTriangleIcon } from '../../components/icons'

function ScoreBar({ score }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-500' : 'bg-gray-400'
  return (
    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden shrink-0">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
    </div>
  )
}

function RecommendationRow({ rec, onAssign, disabled }) {
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
        className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shrink-0"
      >
        {disabled ? '…' : 'Assign'}
      </button>
    </div>
  )
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set()) // Stores consolidated group keys
  const [subModal, setSubModal] = useState(null) // { group, activeReq, recommendations, others }
  const [cancelModal, setCancelModal] = useState(null) // { group, impact }
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [candidateFilters, setCandidateFilters] = useState({ crossDepartment: false, handlesClass: false, department: '', search: '' })

  const loadCandidates = async (request, filters = candidateFilters) => {
    const params = { include_cross_department: filters.crossDepartment, only_handles_class: filters.handlesClass }
    const [{ data: recommendations }, { data: freeTeachers }] = await Promise.all([
      leavesApi.recommendations(request.id, 100, params),
      leavesApi.freeTeachers(request.id, { include_cross_department: filters.crossDepartment, only_handles_class: filters.handlesClass }),
    ])
    const recommendedIds = new Set(recommendations.map(r => r.teacher.id))
    return { recommendations, others: freeTeachers.filter(t => !recommendedIds.has(t.id)) }
  }

  const groupLeaves = (leavesList) => {
    const map = {}
    leavesList.forEach(l => {
      const key = `${l.teacher_id}_${l.date}`
      if (!map[key]) {
        map[key] = {
          key,
          teacher_id: l.teacher_id,
          teacher: l.teacher,
          date: l.date,
          day_order: l.day_order,
          is_emergency: false,
          status: 'approved',
          requests: []
        }
      }
      map[key].requests.push(l)
      if (l.is_emergency) {
        map[key].is_emergency = true
      }
    })

    Object.values(map).forEach(g => {
      const statuses = g.requests.map(r => r.status)
      if (statuses.includes('pending')) {
        g.status = 'pending'
      } else if (statuses.every(s => s === 'cancelled')) {
        g.status = 'cancelled'
      } else if (statuses.every(s => s === 'rejected')) {
        g.status = 'rejected'
      } else {
        g.status = 'approved'
      }
    })

    return Object.values(map)
  }

  const groupedLeavesList = useMemo(() => groupLeaves(leaves), [leaves])

  const load = () => {
    setLoading(true)
    return leavesApi.all()
      .then(r => {
        setLeaves(r.data)
        return r.data
      })
      .catch(err => {
        alert('Failed to load leave requests.')
        return []
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all leave requests and substitution assignments? This action cannot be undone.")) {
      return
    }
    setActionLoading('clear_history')
    try {
      await adminApi.clearLeavesHistory()
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to clear leaves history.')
    } finally {
      setActionLoading(null)
    }
  }

  const pendingGroupKeys = useMemo(() => {
    return groupedLeavesList.filter(g => g.status === 'pending').map(g => g.key)
  }, [groupedLeavesList])

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(prev => prev.size === pendingGroupKeys.length ? new Set() : new Set(pendingGroupKeys))
  }

  const handleApproveGroup = async (group) => {
    setActionLoading(group.key + '_approve')
    try {
      const pendingReqs = group.requests.filter(r => r.status === 'pending')
      const results = await Promise.all(pendingReqs.map(r => leavesApi.approve(r.id).then(res => res.data.leave)))
      
      const updatedList = await load()
      
      const unassigned = results.find(r => !r.alter_assignment)
      if (unassigned) {
        const freshGroup = groupLeaves(updatedList).find(g => g.key === group.key)
        if (freshGroup) {
          openSubModal(freshGroup, freshGroup.requests.find(r => r.id === unassigned.id))
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve leaves.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectGroup = async (group) => {
    setActionLoading(group.key + '_reject')
    try {
      const pendingReqs = group.requests.filter(r => r.status === 'pending')
      await Promise.all(pendingReqs.map(r => leavesApi.reject(r.id)))
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject leaves.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    setActionLoading('bulk')
    try {
      const ids = []
      selected.forEach(key => {
        const g = groupedLeavesList.find(x => x.key === key)
        if (g) {
          g.requests.forEach(r => {
            if (r.status === 'pending') ids.push(r.id)
          })
        }
      })
      if (ids.length === 0) return
      await leavesApi.bulkApprove(ids)
      setSelected(new Set())
      load()
    } catch (err) {
      alert('Failed to bulk approve.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkReject = async () => {
    setActionLoading('bulk')
    try {
      const ids = []
      selected.forEach(key => {
        const g = groupedLeavesList.find(x => x.key === key)
        if (g) {
          g.requests.forEach(r => {
            if (r.status === 'pending') ids.push(r.id)
          })
        }
      })
      if (ids.length === 0) return
      await leavesApi.bulkReject(ids)
      setSelected(new Set())
      load()
    } catch (err) {
      alert('Failed to bulk reject.')
    } finally {
      setActionLoading(null)
    }
  }

  const openSubModal = async (group, req = null) => {
    const active = req || group.requests.find(r => r.status === 'approved') || group.requests[0]
    setActionLoading('load_sub_modal')
    try {
      const { recommendations, others } = await loadCandidates(active)
      
      setSubModal({
        group,
        activeReq: active,
        recommendations,
        others
      })
    } catch (err) {
      alert('Failed to load substitute candidates.')
    } finally {
      setActionLoading(null)
    }
  }

  const switchSubModalPeriod = async (req) => {
    setActionLoading('switch_sub_period')
    try {
      const { recommendations, others } = await loadCandidates(req)
      
      setSubModal(prev => ({
        ...prev,
        activeReq: req,
        recommendations,
        others
      }))
    } catch (err) {
      alert('Failed to switch period slot.')
    } finally {
      setActionLoading(null)
    }
  }

  const applyCandidateFilters = async (nextFilters) => {
    setCandidateFilters(nextFilters)
    if (!subModal) return
    setActionLoading('filter_candidates')
    try {
      const { recommendations, others } = await loadCandidates(subModal.activeReq, nextFilters)
      setSubModal(prev => ({ ...prev, recommendations, others }))
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not apply candidate filters.')
    } finally { setActionLoading(null) }
  }

  const handleAssignSubstitute = async (teacherId, isRecommended) => {
    if (!subModal) return
    setActionLoading('assign')
    try {
      if (isRecommended) {
        await leavesApi.assignRecommended(subModal.activeReq.id, teacherId, { include_cross_department: candidateFilters.crossDepartment })
      } else {
        await leavesApi.assignSubstitute(subModal.activeReq.id, teacherId, { include_cross_department: candidateFilters.crossDepartment })
      }
      const updatedList = await leavesApi.all().then(r => r.data)
      setLeaves(updatedList)
      
      const freshGroup = groupLeaves(updatedList).find(g => g.key === subModal.group.key)
      if (freshGroup) {
        const freshReq = freshGroup.requests.find(r => r.id === subModal.activeReq.id)
        if (freshReq) {
          const { recommendations, others } = await loadCandidates(freshReq)
          setSubModal({
            group: freshGroup,
            activeReq: freshReq,
            recommendations,
            others
          })
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign substitute.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOverride = async (teacherId) => {
    if (!subModal) return
    setActionLoading('override')
    try {
      await leavesApi.overrideSubstitute(subModal.activeReq.id, teacherId, { include_cross_department: candidateFilters.crossDepartment })
      const updatedList = await leavesApi.all().then(r => r.data)
      setLeaves(updatedList)
      
      const freshGroup = groupLeaves(updatedList).find(g => g.key === subModal.group.key)
      if (freshGroup) {
        const freshReq = freshGroup.requests.find(r => r.id === subModal.activeReq.id)
        if (freshReq) {
          const [{ data: recommendations }, { data: freeTeachers }] = await Promise.all([
            leavesApi.recommendations(freshReq.id),
            leavesApi.freeTeachers(freshReq.id),
          ])
          const recommendedIds = new Set(recommendations.map(r => r.teacher.id))
          const others = freeTeachers.filter(t => !recommendedIds.has(t.id))
          setSubModal({
            group: freshGroup,
            activeReq: freshReq,
            recommendations,
            others
          })
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to swap substitute.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUndo = async (reqId) => {
    if (!subModal) return
    setActionLoading(reqId + '_undo')
    try {
      await leavesApi.undoAssignment(reqId)
      const updatedList = await leavesApi.all().then(r => r.data)
      setLeaves(updatedList)
      
      const freshGroup = groupLeaves(updatedList).find(g => g.key === subModal.group.key)
      if (freshGroup) {
        const freshReq = freshGroup.requests.find(r => r.id === reqId)
        if (freshReq) {
          const [{ data: recommendations }, { data: freeTeachers }] = await Promise.all([
            leavesApi.recommendations(freshReq.id),
            leavesApi.freeTeachers(freshReq.id),
          ])
          const recommendedIds = new Set(recommendations.map(r => r.teacher.id))
          const others = freeTeachers.filter(t => !recommendedIds.has(t.id))
          setSubModal({
            group: freshGroup,
            activeReq: freshReq,
            recommendations,
            others
          })
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to undo assignment.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleLock = async (req) => {
    if (!subModal) return
    const locked = !req.alter_assignment.is_locked
    setActionLoading(req.id + '_lock')
    try {
      await leavesApi.setLock(req.id, locked)
      const updatedList = await leavesApi.all().then(r => r.data)
      setLeaves(updatedList)
      
      const freshGroup = groupLeaves(updatedList).find(g => g.key === subModal.group.key)
      if (freshGroup) {
        const freshReq = freshGroup.requests.find(r => r.id === req.id)
        if (freshReq) {
          setSubModal(prev => ({
            ...prev,
            group: freshGroup,
            activeReq: freshReq
          }))
        }
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle lock.')
    } finally {
      setActionLoading(null)
    }
  }

  const openCancelModal = async (group) => {
    const active = group.requests.find(r => r.status !== 'cancelled' && r.status !== 'rejected')
    if (!active) return
    setActionLoading(group.key + '_cancel_open')
    try {
      const { data: impact } = await leavesApi.cancelImpact(active.id)
      setCancelModal({ group, impact })
      setCancelReason('')
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to fetch cancel impact.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAdminCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return
    setActionLoading('admin_cancel')
    try {
      const activeReqs = cancelModal.group.requests.filter(r => r.status !== 'cancelled' && r.status !== 'rejected')
      await Promise.all(activeReqs.map(r => leavesApi.adminCancel(r.id, cancelReason.trim())))
      setCancelModal(null)
      setCancelReason('')
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel leaves.')
    } finally {
      setActionLoading(null)
    }
  }

  const candidateMatchesLocalFilters = (candidate) => {
    const teacher = candidate.teacher || candidate
    const department = teacher.department || ''
    const name = teacher.name || ''
    return (!candidateFilters.department || department === candidateFilters.department) &&
      (!candidateFilters.search || `${name} ${department}`.toLowerCase().includes(candidateFilters.search.toLowerCase()))
  }

  const candidateDepartments = subModal ? [...new Set([
    ...subModal.recommendations.map(r => r.teacher.department),
    ...subModal.others.map(t => t.department),
  ].filter(Boolean))].sort() : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
        <div className="flex items-center gap-2">
          {selected.size === 0 && (
            <button
              onClick={handleClearHistory}
              disabled={actionLoading === 'clear_history'}
              className="inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold border border-red-200 transition"
            >
              {actionLoading === 'clear_history' ? 'Clearing…' : 'Clear Leaves History'}
            </button>
          )}
          {selected.size > 0 && (
            <div className="flex gap-2">
              <button onClick={handleBulkApprove} disabled={actionLoading === 'bulk'} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                Approve {selected.size} selected
              </button>
              <button onClick={handleBulkReject} disabled={actionLoading === 'bulk'} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                Reject {selected.size} selected
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : leaves.length === 0 ? <EmptyState message="No leave requests yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  {pendingGroupKeys.length > 0 && (
                    <input type="checkbox" checked={selected.size === pendingGroupKeys.length} onChange={toggleSelectAll} />
                  )}
                </th>
                {['Teacher', 'Date', 'Day Order', 'Period', 'Reason', 'Status', 'Substitute', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupedLeavesList.map(group => {
                const firstReq = group.requests[0]
                const approved = group.requests.filter(r => r.status === 'approved')
                const covered = approved.filter(r => r.alter_assignment)
                const subsNames = [...new Set(covered.map(r => r.alter_assignment.substitute?.name))].filter(Boolean)
                const hasUnassigned = approved.some(r => !r.alter_assignment)

                return (
                  <tr key={group.key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      {group.status === 'pending' && (
                        <input type="checkbox" checked={selected.has(group.key)} onChange={() => toggleSelect(group.key)} />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{group.teacher?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{group.date}</td>
                    <td className="px-4 py-3 text-gray-500">DO {group.day_order}</td>
                    <td className="px-4 py-3 text-gray-500">
                      P{group.requests.map(r => r.period_number).sort().join(', P')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {group.is_emergency && <AlertTriangleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        {firstReq?.reason}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={group.status} /></td>
                    <td className="px-4 py-3">
                      {approved.length > 0 ? (
                        covered.length === approved.length ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-750">{subsNames.join(', ')}</p>
                            <div className="flex items-center gap-1">
                              <AssignmentTypeBadge type={covered[0]?.alter_assignment.assignment_type} small />
                              {covered.some(r => r.alter_assignment.is_locked) && <LockIcon className="w-3.5 h-3.5 text-gray-400" />}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Needs substitute ({covered.length}/{approved.length})</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {group.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveGroup(group)}
                              disabled={!!actionLoading}
                              className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === group.key + '_approve' ? '…' : 'Approve All'}
                            </button>
                            <button
                              onClick={() => handleRejectGroup(group)}
                              disabled={!!actionLoading}
                              className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === group.key + '_reject' ? '…' : 'Reject All'}
                            </button>
                          </>
                        )}
                        {group.status === 'approved' && hasUnassigned && (
                          <button
                            onClick={() => openSubModal(group)}
                            className="text-xs px-2.5 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            Assign Sub
                          </button>
                        )}
                        {group.status === 'approved' && !hasUnassigned && approved.length > 0 && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openSubModal(group)}
                              title="Swap substitute"
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300"
                            >
                              <SwapIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {group.status !== 'cancelled' && group.status !== 'rejected' && (
                          <button
                            onClick={() => openCancelModal(group)}
                            disabled={!!actionLoading}
                            title="Cancel leaves"
                            className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-30 font-medium"
                          >
                            {actionLoading === group.key + '_cancel_open' ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* substitution modal with period selector */}
      <Modal open={!!subModal} onClose={() => setSubModal(null)} title="Manage Substitutions">
        {subModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-gray-700">{subModal.group.teacher?.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{subModal.group.date} · Day Order {subModal.group.day_order}</p>
            </div>

            {/* Select Slot to substitute */}
            {subModal.group.requests.filter(r => r.status === 'approved').length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Period Slot to Configure:</p>
                <div className="flex gap-1.5">
                  {subModal.group.requests.filter(r => r.status === 'approved').map(r => (
                    <button
                      key={r.id}
                      onClick={() => switchSubModalPeriod(r)}
                      disabled={actionLoading === 'switch_sub_period'}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${
                        subModal.activeReq.id === r.id
                          ? 'bg-primary-600 text-white border-primary-750 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Period P{r.period_number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-400 uppercase">Selected Slot Details:</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">Period P{subModal.activeReq.period_number}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Candidate filters</p>
                {actionLoading === 'filter_candidates' && <span className="text-xs text-primary-600">Updating…</span>}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={candidateFilters.crossDepartment} onChange={e => applyCandidateFilters({ ...candidateFilters, crossDepartment: e.target.checked })} />
                  Include other departments
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={candidateFilters.handlesClass} onChange={e => applyCandidateFilters({ ...candidateFilters, handlesClass: e.target.checked })} />
                  Only teachers handling this class
                </label>
                <select className="tt-input text-xs py-1.5" value={candidateFilters.department} onChange={e => setCandidateFilters({ ...candidateFilters, department: e.target.value })}>
                  <option value="">All departments</option>
                  {candidateDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input className="tt-input text-xs py-1.5 min-w-[160px]" placeholder="Search teacher…" value={candidateFilters.search} onChange={e => setCandidateFilters({ ...candidateFilters, search: e.target.value })} />
              </div>
            </div>

            {subModal.activeReq.alter_assignment ? (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-blue-900">
                    Assigned Substitute: <span className="font-bold">{subModal.activeReq.alter_assignment.substitute?.name}</span>
                  </p>
                  <AssignmentTypeBadge type={subModal.activeReq.alter_assignment.assignment_type} small />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleLock(subModal.activeReq)}
                    disabled={actionLoading === subModal.activeReq.id + '_lock'}
                    className="text-[11px] font-semibold text-gray-600 hover:text-primary-600 transition flex items-center gap-1"
                  >
                    {subModal.activeReq.alter_assignment.is_locked ? <><UnlockIcon className="w-3 h-3" /> Unlock</> : <><LockIcon className="w-3 h-3" /> Lock (protect)</>}
                  </button>
                  <button
                    onClick={() => handleUndo(subModal.activeReq.id)}
                    disabled={subModal.activeReq.alter_assignment.is_locked || actionLoading === subModal.activeReq.id + '_undo'}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition disabled:opacity-30"
                  >
                    Undo Assignment
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                Needs substitute candidate assignment
              </div>
            )}

            {subModal.recommendations.filter(candidateMatchesLocalFilters).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 flex items-center gap-1.5">
                  <SparklesIcon className="w-3.5 h-3.5 text-primary-500" /> Recommended for Period P{subModal.activeReq.period_number}
                </p>
                <div className="space-y-2">
                  {subModal.recommendations.filter(candidateMatchesLocalFilters).map(rec => (
                    <RecommendationRow
                      key={rec.teacher.id}
                      rec={rec}
                      onAssign={handleAssignSubstitute}
                      disabled={actionLoading === 'assign' || (subModal.activeReq.alter_assignment && subModal.activeReq.alter_assignment.is_locked)}
                    />
                  ))}
                </div>
              </div>
            )}

            {subModal.others.filter(candidateMatchesLocalFilters).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4">
                  Other available teachers ({subModal.others.filter(candidateMatchesLocalFilters).length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {subModal.others.filter(candidateMatchesLocalFilters).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{t.department || 'No dept'}</p>
                          <span className="text-xs text-gray-300">·</span>
                          <p className="text-xs text-gray-500">
                            {t.today_workload ?? 0} {t.today_workload === 1 ? 'period' : 'periods'} today
                            {t.today_periods && t.today_periods.length > 0 && (
                              <span className="text-gray-400"> (P{t.today_periods.sort((a, b) => a - b).join(', P')})</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {subModal.activeReq.alter_assignment ? (
                        subModal.activeReq.alter_assignment.substitute_teacher_id !== t.id && (
                          <button
                            onClick={() => handleOverride(t.id)}
                            disabled={actionLoading === 'override' || subModal.activeReq.alter_assignment.is_locked}
                            className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-primary-300 transition-colors disabled:opacity-50"
                          >
                            Swap
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleAssignSubstitute(t.id, false)}
                          disabled={actionLoading === 'assign'}
                          className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-primary-300 transition-colors disabled:opacity-50"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subModal.recommendations.filter(candidateMatchesLocalFilters).length === 0 && subModal.others.filter(candidateMatchesLocalFilters).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No eligible teachers for this period.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Admin Cancel Leave Group */}
      <Modal open={!!cancelModal} onClose={() => { setCancelModal(null); setCancelReason('') }} title="Cancel Leave Requests">
        {cancelModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
              <p className="font-semibold text-red-800">
                Cancel all leave requests for {cancelModal.impact.teacher_name}
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                {cancelModal.impact.leave_date} &middot; Day Order {cancelModal.impact.day_order} &middot; Periods P{cancelModal.group.requests.map(r => r.period_number).sort().join(', P')}
              </p>
            </div>

            {cancelModal.impact.has_substitute && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold">Warning: Substitution assignments exist for these slots</p>
                <p className="text-amber-600 mt-1">All substitution assignments for the day will be removed and credit transactions will be reversed.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reason for cancellation *</label>
              <textarea
                className="tt-input w-full text-sm"
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancelling these leaves..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setCancelModal(null); setCancelReason('') }}
                className="text-xs px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Leaves
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={!cancelReason.trim() || actionLoading === 'admin_cancel'}
                className="text-xs px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
              >
                {actionLoading === 'admin_cancel' ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
