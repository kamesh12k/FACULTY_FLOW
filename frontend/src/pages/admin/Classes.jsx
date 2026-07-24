import { useEffect, useState } from 'react'
import { classesApi, departmentsApi } from '../../api/services'
import { Spinner, ErrorAlert, Modal, EmptyState } from '../../components/ui'

export default function AdminClasses() {
  const [classes, setClasses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Class State
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', section: '', department_id: '', semester: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit Class State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', section: '', department_id: '', semester: 1 })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = () => classesApi.list().then(r => setClasses(r.data)).finally(() => setLoading(false))

  useEffect(() => {
    load()
    departmentsApi.list(true).then(r => setDepartments(r.data))
  }, [])


  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await classesApi.create({ ...form, department_id: Number(form.department_id), semester: Number(form.semester) })
      setModalOpen(false)
      setForm({ name: '', section: '', department_id: '', semester: 1 })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create class.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditModal = (cls) => {
    setSelectedClass(cls)
    setEditForm({
      name: cls.name,
      section: cls.section,
      department_id: cls.department_id,
      semester: cls.semester,
    })
    setEditError('')
    setEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      await classesApi.update(selectedClass.id, {
        name: editForm.name,
        section: editForm.section,
        department_id: Number(editForm.department_id),
        semester: Number(editForm.semester),
      })
      setEditModalOpen(false)
      load()
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update class.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleOpenDelete = (cls) => {
    setClassToDelete(cls)
    setDeleteError('')
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await classesApi.remove(classToDelete.id)
      setDeleteConfirmOpen(false)
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete class.')
    } finally {
      setDeleting(false)
    }
  }

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Classes</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">+ Add Class</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : classes.length === 0 ? <EmptyState message="No classes yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Section', 'Department', 'Semester', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.section}</td>
                  <td className="px-5 py-3 text-gray-500">{deptName(c.department_id)}</td>
                  <td className="px-5 py-3 text-gray-500">Sem {c.semester}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleOpenEditModal(c)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold hover:underline">Edit</button>
                      <button onClick={() => handleOpenDelete(c)} className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Class">
        <form onSubmit={handleCreate} className="space-y-4">
          <ErrorAlert message={error} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class name</label>
            <input type="text" required className="input" placeholder="I B.Sc CS" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
            <input type="text" required className="input" placeholder="A" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
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

      {/* Edit Class Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Class">
        <form onSubmit={handleUpdate} className="space-y-4">
          <ErrorAlert message={editError} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Class name</label>
            <input type="text" required className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
            <input type="text" required className="input" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} />
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

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Class">
        <div className="space-y-4">
          <ErrorAlert message={deleteError} />
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold text-gray-800">{classToDelete?.name} - {classToDelete?.section}</span>?
          </p>
          <p className="text-xs text-red-500 font-medium">This class cannot be deleted if it has slots on the academic timetable.</p>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={handleDeleteConfirm} disabled={deleting} className="btn-danger flex-1">
              {deleting ? 'Deleting…' : 'Delete Class'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
