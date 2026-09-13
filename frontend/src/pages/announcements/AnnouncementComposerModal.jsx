import { useState, useEffect, useRef } from 'react'
import { CloseIcon, PaperclipIcon, PinIcon, CheckIcon, AlertTriangleIcon } from '../../components/icons'
import { Spinner } from '../../components/ui'
import { announcementApi } from '../../api/announcements'
import { useToast } from '../../components/ui/Toast'

const ANNOUNCEMENT_TYPES = [
  { id: 'GENERAL', label: 'General Announcement' },
  { id: 'CIRCULAR', label: 'Official Circular' },
  { id: 'NOTICE', label: 'Notice' },
  { id: 'URGENT', label: 'Urgent Notification' },
  { id: 'ACADEMIC', label: 'Academic & Curriculum' },
  { id: 'ADMINISTRATIVE', label: 'Administrative Order' },
  { id: 'EVENT', label: 'Event / Assembly' },
]

const PRIORITIES = [
  { id: 'NORMAL', label: 'Normal', badge: 'bg-slate-100 text-slate-700' },
  { id: 'IMPORTANT', label: 'Important', badge: 'bg-amber-100 text-amber-800' },
  { id: 'HIGH', label: 'High', badge: 'bg-orange-100 text-orange-800' },
  { id: 'URGENT', label: 'Urgent', badge: 'bg-rose-100 text-rose-800' },
]

export default function AnnouncementComposerModal({ user, onClose, onCreated }) {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const isHod = user?.role === 'admin'
  const isPrincipal = user?.role === 'principal' || user?.role === 'system_admin'

  // Form State
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('CIRCULAR')
  const [priority, setPriority] = useState('NORMAL')

  // Audience Target State
  const [targetType, setTargetType] = useState(isHod ? 'DEPARTMENT' : 'COLLEGE')
  const [selectedDeptIds, setSelectedDeptIds] = useState(isHod && user.department_id ? [user.department_id] : [])
  const [selectedUserIds, setSelectedUserIds] = useState([])

  // Directory Data for Audience Selector
  const [candidateData, setCandidateData] = useState({ departments: [], faculty: [] })
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('all')
  const [facultySearch, setFacultySearch] = useState('')

  // Attachments State
  const [attachments, setAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState([])

  // Options State
  const [requiresAck, setRequiresAck] = useState(false)
  const [allowReplies, setAllowReplies] = useState(true)
  const [allowReactions, setAllowReactions] = useState(true)
  const [allowDownload, setAllowDownload] = useState(true)
  const [isPinned, setIsPinned] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  const [submitting, setSubmitting] = useState(false)

  // Fetch targetable candidate directory
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await announcementApi.getCandidates()
        setCandidateData(res.data)
        if (isHod && user?.department_id) {
          setSelectedDeptIds([user.department_id])
        }
      } catch (err) {
        showToast('Could not fetch audience candidates directory', 'error')
      }
    }
    fetchCandidates()
  }, [user])

  // Handle File Selection and Direct Upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (attachments.length + files.length > 5) {
      showToast('Maximum 5 attachments allowed per announcement', 'error')
      return
    }

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 25 MB limit`, 'error')
        continue
      }

      const tempId = Math.random().toString(36).substring(7)
      setUploadingFiles((prev) => [...prev, { tempId, name: file.name, progress: 0 }])

      try {
        // 1. Presign upload
        const presignRes = await announcementApi.presignAttachmentUpload({
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })

        const presign = presignRes.data

        // 2. Stream upload with progress
        const uploadRes = await announcementApi.uploadAttachmentStream(
          presign.upload_url,
          file,
          (percent) => {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.tempId === tempId ? { ...f, progress: percent } : f))
            )
          }
        )

        // 3. Complete and store attachment metadata
        setAttachments((prev) => [
          ...prev,
          {
            file_name: presign.file_name,
            file_type: presign.file_type,
            file_size: presign.file_size,
            storage_key: presign.storage_key,
            checksum_sha256: uploadRes.data.checksum_sha256,
          },
        ])
      } catch (err) {
        showToast(`Failed to upload "${file.name}": ${err.response?.data?.detail || err.message}`, 'error')
      } finally {
        setUploadingFiles((prev) => prev.filter((f) => f.tempId !== tempId))
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Filtered faculty list for user targeting
  const filteredFaculty = candidateData.faculty.filter((f) => {
    const matchesDept =
      facultyDeptFilter === 'all' || String(f.department_id) === String(facultyDeptFilter)
    const matchesSearch =
      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(facultySearch.toLowerCase()))
    return matchesDept && matchesSearch
  })

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const toggleDeptSelection = (deptId) => {
    if (isHod) return // HOD is locked to own dept
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  const handleSelectAllFaculty = () => {
    const allIds = filteredFaculty.map((f) => f.id)
    setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...allIds])))
  }

  const handleClearFaculty = () => {
    setSelectedUserIds([])
  }

  const handleSubmit = async (publishNow = true) => {
    if (!title.trim()) {
      showToast('Please enter an announcement title', 'error')
      return
    }
    if (!body.trim()) {
      showToast('Please write the announcement message', 'error')
      return
    }

    if (targetType === 'DEPARTMENT' && !selectedDeptIds.length) {
      showToast('Please select at least one department', 'error')
      return
    }
    if (targetType === 'USER' && !selectedUserIds.length) {
      showToast('Please select at least one faculty member', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        type,
        priority,
        target_type: targetType,
        department_ids: selectedDeptIds,
        user_ids: selectedUserIds,
        is_pinned: isPinned,
        requires_acknowledgement: requiresAck,
        allow_replies: allowReplies,
        allow_reactions: allowReactions,
        allow_download: allowDownload,
        publish_now: publishNow && !isScheduled,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        attachments,
      }

      await announcementApi.createAnnouncement(payload)
      showToast(
        publishNow
          ? 'Announcement published successfully'
          : isScheduled
          ? 'Announcement scheduled successfully'
          : 'Draft saved',
        'success'
      )
      onCreated()
      onClose()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to publish announcement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900">
              {isHod ? 'Publish Department Announcement' : 'Publish Institutional Circular'}
            </h2>
            <p className="text-xs text-slate-600">
              {isHod
                ? `Posting as HOD (${user.department || 'Departmental'})`
                : 'Posting as Institutional Administrator / Principal'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <span className="w-5 h-5"><CloseIcon /></span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Title & Classification */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Announcement Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Examination Duty Schedule & Guidelines (Odd Semester)"
                className="w-full text-sm font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Type / Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  {ANNOUNCEMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Audience Targeting Selector */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              Audience Scope <span className="text-rose-500">*</span>
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              {isPrincipal && (
                <button
                  type="button"
                  onClick={() => setTargetType('COLLEGE')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    targetType === 'COLLEGE'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  🏛️ Entire College
                </button>
              )}

              <button
                type="button"
                onClick={() => setTargetType('DEPARTMENT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  targetType === 'DEPARTMENT'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                🏫 {isHod ? 'My Department' : 'Specific Department(s)'}
              </button>

              <button
                type="button"
                onClick={() => setTargetType('USER')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  targetType === 'USER'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                👥 Individual Faculty Member(s)
              </button>
            </div>

            {/* Department Multi-Select (for Principal) */}
            {targetType === 'DEPARTMENT' && isPrincipal && (
              <div className="mt-2 pt-2 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Select Targeted Departments:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {candidateData.departments.map((dept) => {
                    const selected = selectedDeptIds.includes(dept.id)
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDeptSelection(dept.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{dept.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* HOD Department Confined Banner */}
            {targetType === 'DEPARTMENT' && isHod && (
              <div className="text-xs font-semibold text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <span>🔒 Targeted exclusively to:</span>
                <span className="font-extrabold text-slate-900">{user.department || 'Your Department'}</span>
              </div>
            )}

            {/* Faculty Multi-Select Picker */}
            {targetType === 'USER' && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isPrincipal && (
                      <select
                        value={facultyDeptFilter}
                        onChange={(e) => setFacultyDeptFilter(e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1"
                      >
                        <option value="all">All Departments</option>
                        {candidateData.departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      placeholder="Search faculty name..."
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllFaculty}
                      className="font-bold text-primary-600 hover:underline"
                    >
                      Select All Filtered
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleClearFaculty}
                      className="font-bold text-slate-600 hover:underline"
                    >
                      Clear
                    </button>
                    <span className="font-mono text-slate-600 font-bold">
                      ({selectedUserIds.length} selected)
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredFaculty.map((fac) => {
                    const isSelected = selectedUserIds.includes(fac.id)
                    return (
                      <label
                        key={fac.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-50 text-primary-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(fac.id)}
                          className="rounded-sm text-primary-600 focus:ring-primary-500"
                        />
                        <span className="truncate">{fac.name}</span>
                        <span className="text-[10px] text-slate-600 font-normal truncate">
                          ({fac.department_name || 'General'})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Circular Message Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter official circular content, guidelines, dates, and instructions for faculty members..."
              className="w-full text-sm bg-white border border-slate-300 rounded-xl p-3.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500 leading-relaxed font-sans"
            />
          </div>

          {/* Drag & Drop Attachments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Official Attachments (PDF, Images • Max 25 MB each)
              </label>
              <span className="text-xs text-slate-600 font-medium">
                {attachments.length}/5 files attached
              </span>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="w-7 h-7 mx-auto block text-slate-600 mb-1.5">
                <PaperclipIcon />
              </span>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drag & drop files here
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                PDF, JPG, PNG, WEBP supported • Virus-safe streaming upload
              </p>
            </div>

            {/* Uploading progress chips */}
            {uploadingFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadingFiles.map((uf) => (
                  <div key={uf.tempId} className="bg-slate-100 rounded-lg p-2 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate">{uf.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary-600 h-1.5 transition-all" style={{ width: `${uf.progress}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">{uf.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Attached files list */}
            {attachments.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    <span>📎</span>
                    <span className="truncate max-w-[180px]">{att.file_name}</span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      ({(att.file_size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-600 hover:text-rose-600 p-0.5 rounded-sm"
                    >
                      <span className="w-3.5 h-3.5"><CloseIcon /></span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options Toggles */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Compliance & Engagement Options</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200/60">
                <input
                  type="checkbox"
                  checked={requiresAck}
                  onChange={(e) => setRequiresAck(e.target.checked)}
                  className="rounded-sm text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-bold block">⚠️ Require Formal Acknowledgement</span>
                  <span className="text-[10px] text-slate-600">Faculty must click "I have read and understood"</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200/60">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded-sm text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-bold block">📌 Pin to Top of Feed</span>
                  <span className="text-[10px] text-slate-600">Keep prominent at top of all faculty feeds</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200/60">
                <input
                  type="checkbox"
                  checked={allowReplies}
                  onChange={(e) => setAllowReplies(e.target.checked)}
                  className="rounded-sm text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-bold block">💬 Allow Conversation Replies</span>
                  <span className="text-[10px] text-slate-600">Enables threaded Teams-style Q&A</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 border border-slate-200/60">
                <input
                  type="checkbox"
                  checked={allowReactions}
                  onChange={(e) => setAllowReactions(e.target.checked)}
                  className="rounded-sm text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="font-bold block">👍 Allow Emoji Reactions</span>
                  <span className="text-[10px] text-slate-600">Faculty can express quick acknowledgement</span>
                </div>
              </label>
            </div>

            {/* Schedule Option */}
            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded-sm text-primary-600 focus:ring-primary-500"
                />
                <span>Schedule publication for a future date & time</span>
              </label>

              {isScheduled && (
                <div className="mt-2 pl-5">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Will not become visible to faculty until this timestamp.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Discard
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Spinner size="sm" className="border-white border-t-transparent" />}
              <span>{isScheduled ? 'Schedule Announcement' : 'Publish Announcement'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
