import { useEffect, useState } from 'react'
import { roomsApi, departmentsApi } from '../../api/services'
import { Spinner, ErrorAlert, Modal, EmptyState } from '../../components/ui'

export default function AdminRooms() {
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Room State
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ room_number: '', room_type: 'classroom', capacity: 40, department_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit Room State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [editForm, setEditForm] = useState({ room_number: '', room_type: 'classroom', capacity: 40, department_id: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = () => roomsApi.list().then(r => setRooms(r.data)).finally(() => setLoading(false))

  useEffect(() => {
    load()
    departmentsApi.list().then(r => setDepartments(r.data))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await roomsApi.create({
        ...form,
        capacity: Number(form.capacity),
        department_id: form.department_id ? Number(form.department_id) : null,
      })
      setModalOpen(false)
      setForm({ room_number: '', room_type: 'classroom', capacity: 40, department_id: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create room.')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditModal = (room) => {
    setSelectedRoom(room)
    setEditForm({
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: room.capacity,
      department_id: room.department_id || '',
    })
    setEditError('')
    setEditModalOpen(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      await roomsApi.update(selectedRoom.id, {
        room_number: editForm.room_number,
        room_type: editForm.room_type,
        capacity: Number(editForm.capacity),
        department_id: editForm.department_id ? Number(editForm.department_id) : null,
      })
      setEditModalOpen(false)
      load()
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update room.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleOpenDelete = (room) => {
    setRoomToDelete(room)
    setDeleteError('')
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      await roomsApi.remove(roomToDelete.id)
      setDeleteConfirmOpen(false)
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete room.')
    } finally {
      setDeleting(false)
    }
  }

  const deptName = (id) => departments.find(d => d.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Rooms & Labs</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">+ Add Room</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rooms.length === 0 ? <EmptyState message="No rooms yet." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Room', 'Type', 'Capacity', 'Department', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.room_number}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${r.room_type === 'lab' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.room_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{r.capacity}</td>
                  <td className="px-5 py-3 text-gray-500">{deptName(r.department_id)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleOpenEditModal(r)} className="text-xs text-primary-600 hover:text-primary-800 font-semibold hover:underline">Edit</button>
                      <button onClick={() => handleOpenDelete(r)} className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Room">
        <form onSubmit={handleCreate} className="space-y-4">
          <ErrorAlert message={error} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Room number</label>
            <input type="text" required className="input" placeholder="CS-101" value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className="input" value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value })}>
              <option value="classroom">Classroom</option>
              <option value="lab">Lab</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" required min={1} className="input" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department (optional)</label>
            <select className="input" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
              <option value="">None</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Room Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Room">
        <form onSubmit={handleUpdate} className="space-y-4">
          <ErrorAlert message={editError} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Room number</label>
            <input type="text" required className="input" value={editForm.room_number} onChange={e => setEditForm({ ...editForm, room_number: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select className="input" value={editForm.room_type} onChange={e => setEditForm({ ...editForm, room_type: e.target.value })}>
              <option value="classroom">Classroom</option>
              <option value="lab">Lab</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" required min={1} className="input" value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department (optional)</label>
            <select className="input" value={editForm.department_id} onChange={e => setEditForm({ ...editForm, department_id: e.target.value })}>
              <option value="">None</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={editSaving} className="btn-primary flex-1">{editSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Room">
        <div className="space-y-4">
          <ErrorAlert message={deleteError} />
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold text-gray-800">Room {roomToDelete?.room_number}</span>?
          </p>
          <p className="text-xs text-red-500 font-medium">This room cannot be deleted if it is referenced in scheduled timetable slots.</p>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={handleDeleteConfirm} disabled={deleting} className="btn-danger flex-1">
              {deleting ? 'Deleting…' : 'Delete Room'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
