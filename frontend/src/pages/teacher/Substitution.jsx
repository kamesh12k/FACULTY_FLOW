import { useEffect, useState, useMemo } from 'react'
import { teacherSubstitutionApi, leavesApi, departmentsApi } from '../../api/services'
import { Spinner, Modal, EmptyState, AssignmentTypeBadge, ErrorAlert } from '../../components/ui'
import { AlertTriangleIcon, SwapIcon, UndoIcon, SettingsIcon, SparklesIcon, FilterIcon, SearchIcon, XMarkIcon } from '../../components/icons'

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
          {rec.teacher.department && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded font-semibold shrink-0">
              {rec.teacher.department}
            </span>
          )}
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
  const [allDepartments, setAllDepartments] = useState([])
  const [activeTab, setActiveTab] = useState('needs-cover')
  const [assignModal, setAssignModal] = useState(null) // { leave, recommendations, others, isOverride }
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [candidateFilters, setCandidateFilters] = useState({
    crossDepartment: false,
    handlesClass: false,
    department: '',
    search: '',
  })

  const loadData = async () => {
    setError('')
    try {
      const [enabledRes, deptsRes] = await Promise.all([
        teacherSubstitutionApi.enabled(),
        departmentsApi.list(true).catch(() => ({ data: [] })),
      ])
      setEnabled(enabledRes.data.teachers_mode_enabled)
      setAllDepartments(deptsRes.data || [])
      
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

  const loadCandidates = async (leave, filters = candidateFilters) => {
    const params = {
      include_cross_department: filters.crossDepartment,
      only_handles_class: filters.handlesClass,
    }
    const [{ data: recommendations }, { data: freeTeachers }] = await Promise.all([
      teacherSubstitutionApi.candidates(leave.id, params),
      teacherSubstitutionApi.freeTeachers(leave.id, params),
    ])
    const recommendedIds = new Set(recommendations.map(r => r.teacher.id))
    const others = freeTeachers.filter(t => !recommendedIds.has(t.id))
    return { recommendations, others }
  }

  const handleOpenAssignModal = async (leave, isOverride = false) => {
    setActionLoading(leave.id + '_load_candidates')
    setError('')
    setFilterError('')
    const initialFilters = { crossDepartment: false, handlesClass: false, department: '', search: '' }
    setCandidateFilters(initialFilters)
    try {
      const { recommendations, others } = await loadCandidates(leave, initialFilters)
      setAssignModal({ leave, recommendations, others, isOverride })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load candidates.')
    } finally {
      setActionLoading(null)
    }
  }

  const applyCandidateFilters = async (nextFilters) => {
    setCandidateFilters(nextFilters)
    if (!assignModal) return
    setActionLoading('filter_candidates')
    setFilterError('')
    try {
      const { recommendations, others } = await loadCandidates(assignModal.leave, nextFilters)
      setAssignModal(prev => ({ ...prev, recommendations, others }))
    } catch (err) {
      setFilterError(err.response?.data?.detail || 'Could not apply candidate filters.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDepartmentChange = (selectedDept) => {
    applyCandidateFilters({
      ...candidateFilters,
      department: selectedDept,
    })
  }

  const handleCrossDeptToggle = (checked) => {
    applyCandidateFilters({
      ...candidateFilters,
      crossDepartment: checked,
      department: '',
    })
  }

  const candidateMatchesLocalFilters = (candidate) => {
    const teacher = candidate.teacher || candidate
    const department = teacher.department || ''
    const name = teacher.name || ''
    return (
      (!candidateFilters.department || department.toLowerCase() === candidateFilters.department.toLowerCase()) &&
      (!candidateFilters.search || `${name} ${department}`.toLowerCase().includes(candidateFilters.search.toLowerCase()))
    )
  }

  const candidateDepartments = useMemo(() => {
    if (!candidateFilters.crossDepartment) {
      if (!assignModal) return []
      const names = []
      assignModal.recommendations.forEach(r => { if (r.teacher?.department) names.push(r.teacher.department) })
      assignModal.others.forEach(t => { if (t?.department) names.push(t.department) })
      if (assignModal.leave?.teacher?.department) names.push(assignModal.leave.teacher.department)
      return [...new Set(names.filter(Boolean))].sort()
    }
    const names = allDepartments.map(d => d.name)
    if (assignModal) {
      assignModal.recommendations.forEach(r => { if (r.teacher?.department) names.push(r.teacher.department) })
      assignModal.others.forEach(t => { if (t?.department) names.push(t.department) })
    }
    return [...new Set(names.filter(Boolean))].sort()
  }, [allDepartments, assignModal, candidateFilters.crossDepartment])

  const handleAssignSubstitute = async (substituteId) => {
    const leaveId = assignModal.leave.id
    setActionLoading('assign')
    try {
      const params = { include_cross_department: candidateFilters.crossDepartment }
      if (assignModal.isOverride) {
        await teacherSubstitutionApi.override(leaveId, substituteId, params)
      } else {
        await teacherSubstitutionApi.assign(leaveId, substituteId, params)
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
      <div className="border-b border-gray-100 flex gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
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
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm" style={{ minWidth: '550px' }}>
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
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm" style={{ minWidth: '600px' }}>
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
        {assignModal && (() => {
          const matchingRecs = assignModal.recommendations.filter(candidateMatchesLocalFilters)
          const matchingOthers = assignModal.others.filter(candidateMatchesLocalFilters)
          const totalAvailable = matchingRecs.length + matchingOthers.length

          return (
            <div className="space-y-4">
              {/* Slot Details Header */}
              <div className="p-3.5 bg-gradient-to-r from-slate-50 via-gray-50 to-indigo-50/40 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200/80 rounded-lg font-semibold text-slate-800 shadow-sm">
                    📅 {assignModal.leave.date}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200/80 rounded-lg font-semibold text-slate-700 shadow-sm">
                    DO {assignModal.leave.day_order} · Period {assignModal.leave.period_number}
                  </span>
                </div>
                {assignModal.leave.reason && (
                  <p className="text-xs text-slate-600 truncate max-w-full font-medium italic">
                    "{assignModal.leave.reason}"
                  </p>
                )}
              </div>

              <ErrorAlert message={filterError} />

              {/* Candidate Filters Redesign */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                      <FilterIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Candidate Filters</h4>
                      <p className="text-[11px] text-slate-500">
                        {totalAvailable} {totalAvailable === 1 ? 'candidate' : 'candidates'} available
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {actionLoading === 'filter_candidates' && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium">
                        <Spinner size="sm" /> Refreshing…
                      </span>
                    )}
                    {(candidateFilters.crossDepartment || candidateFilters.handlesClass || candidateFilters.department || candidateFilters.search) && (
                      <button
                        type="button"
                        onClick={() => applyCandidateFilters({ crossDepartment: false, handlesClass: false, department: '', search: '' })}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Search and Department row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
                      placeholder="Search candidate name…"
                      value={candidateFilters.search}
                      onChange={e => setCandidateFilters({ ...candidateFilters, search: e.target.value })}
                    />
                    {candidateFilters.search && (
                      <button
                        type="button"
                        onClick={() => setCandidateFilters({ ...candidateFilters, search: '' })}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      className="w-full px-3 py-2 text-xs bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition font-medium text-slate-700 cursor-pointer"
                      value={candidateFilters.department}
                      onChange={e => handleDepartmentChange(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {candidateDepartments.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Toggle Switch Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCrossDeptToggle(!candidateFilters.crossDepartment)}
                    disabled={actionLoading === 'filter_candidates'}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      candidateFilters.crossDepartment
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-sm ring-1 ring-indigo-500/10'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200/90 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate">Other Departments</p>
                      <p className="text-[11px] text-slate-500 truncate">Search across campus</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        candidateFilters.crossDepartment ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {candidateFilters.crossDepartment ? 'ON' : 'OFF'}
                      </span>
                      <span className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                        candidateFilters.crossDepartment ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}>
                        <span className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${
                          candidateFilters.crossDepartment ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyCandidateFilters({ ...candidateFilters, handlesClass: !candidateFilters.handlesClass })}
                    disabled={actionLoading === 'filter_candidates'}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      candidateFilters.handlesClass
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950 shadow-sm ring-1 ring-amber-500/10'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200/90 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate">Class Faculty Only</p>
                      <p className="text-[11px] text-slate-500 truncate">Teachers of this class</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        candidateFilters.handlesClass ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {candidateFilters.handlesClass ? 'ON' : 'OFF'}
                      </span>
                      <span className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                        candidateFilters.handlesClass ? 'bg-amber-600' : 'bg-slate-300'
                      }`}>
                        <span className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${
                          candidateFilters.handlesClass ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recommended candidates */}
              {matchingRecs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5 text-primary-500" /> Recommended Candidates ({matchingRecs.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {matchingRecs.map(rec => (
                      <RecommendationRow
                        key={rec.teacher.id}
                        rec={rec}
                        onAssign={handleAssignSubstitute}
                        disabled={actionLoading === 'assign'}
                        isOverride={assignModal.isOverride}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other available teachers */}
              {matchingOthers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">
                    Other available teachers ({matchingOthers.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {matchingOthers.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-xl gap-3 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-800">{t.name}</p>
                            {t.department && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-200/80 text-slate-700 rounded-md font-semibold shrink-0">
                                {t.department}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-500">
                              {t.today_workload ?? 0} {t.today_workload === 1 ? 'period' : 'periods'} today
                              {t.today_periods && t.today_periods.length > 0 && (
                                <span className="text-slate-400"> (P{t.today_periods.sort((a, b) => a - b).join(', P')})</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAssignSubstitute(t.id)}
                          disabled={actionLoading === 'assign'}
                          className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shrink-0 font-medium shadow-sm"
                        >
                          {actionLoading === 'assign' ? '…' : assignModal.isOverride ? 'Reassign' : 'Assign'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchingRecs.length === 0 && matchingOthers.length === 0 && (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">No available candidates found matching the selected filters.</p>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModal(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
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
