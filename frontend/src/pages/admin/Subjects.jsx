import { useEffect, useState } from 'react'
import { subjectsApi, departmentsApi } from '../../api/services'
import { Spinner, ErrorAlert, Modal, EmptyState } from '../../components/ui'

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  // Add Subject State
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', subject_type: 'theory', credits: 3, department_id: '', semester: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit Subject State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [editForm, setEditForm] = useState({ code: '', name: '', subject_type: 'theory', credits: 3, department_id: '', semester: 1 })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = () => subjectsApi.list(showArchived).then(r => setSubjects(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [showArchived])
  useEffect(() => { departmentsApi.list().then(r => setDepartments(r.data)) }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await subjectsApi.create({ ...form, credits: Number(form.credits), department_id: Number(form.department_id), semester: Number(form.semester) })
      setModalOpen(false)
      setForm({ code: '', name: '', subject_type: 'theory', credits: 3, department_id: '', semester: 1 })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create subject.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditModal = (subject) => {
    setSelectedSubject(subject)
    setEditForm({
      code: subject.code,
      name: subject.name,
      subject_type: subject.subject_type,
      credits: subject.credits,
      department_id: subject.department_id,
      semester: subject.semester,
    })
    setEditError('')
    setEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      await subjectsApi.update(selectedSubject.id, {
        code: editForm.code,
        name: editForm.name,
        subject_type: editForm.subject_type,
        credits: Number(editForm.credits),
        department_id: Number(editForm.department_id),
        semester: Number(editForm.semester),
      })
      setEditModalOpen(false)
      load()
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update subject.')
    } finally {
      setEditSaving(false)
    }
  }

  const toggleArchive = async (s) => {
    try {
      if (s.is_archived) await subjectsApi.unarchive(s.id)
      else await subjectsApi.archive(s.id)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle subject status.')
    }
  }

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Subjects</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer font-medium">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">+ Add Subject</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : subjects.length === 0 ? <EmptyState message="No subjects yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Code', 'Name', 'Type', 'Credits', 'Department', 'Semester', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {subjects.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{s.subject_type}</td>
                  <td className="px-5 py-3 text-gray-500">{s.credits}</td>
                  <td className="px-5 py-3 text-gray-500">{deptName(s.department_id)}</td>
                  <td className="px-5 py-3 text-gray-500">Sem {s.semester}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.is_archived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {s.is_archived ? 'Archived' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleOpenEditModal(s)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold hover:underline">Edit</button>
                      <button onClick={() => toggleArchive(s)} className="text-xs text-gray-500 hover:text-gray-700 font-semibold hover:underline">
                        {s.is_archived ? 'Unarchive' : 'Archive'}
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

      {/* Add Subject Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Subject">
        <form onSubmit={handleCreate} className="space-y-4">
          <ErrorAlert message={error} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
            <input type="text" required className="input" placeholder="CS-202" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required className="input" placeholder="Data Structures" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className="input" value={form.subject_type} onChange={e => setForm({ ...form, subject_type: e.target.value })}>
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Credits</label>
            <input type="number" min={1} required className="input" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <select required className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
              <option value="">Select…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
            <select className="input" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Subject">
        <form onSubmit={handleUpdate} className="space-y-4">
          <ErrorAlert message={editError} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
            <input type="text" required className="input" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input type="text" required className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className="input" value={editForm.subject_type} onChange={e => setEditForm({ ...editForm, subject_type: e.target.value })}>
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Credits</label>
            <input type="number" min={1} required className="input" value={editForm.credits} onChange={e => setEditForm({ ...editForm, credits: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <select required className="input" value={editForm.department_id} onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
            <select className="input" value={editForm.semester} onChange={e => setEditForm({ ...editForm, semester: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={editSaving} className="btn-primary flex-1">{editSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
