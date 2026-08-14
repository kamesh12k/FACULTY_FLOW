import { useEffect, useState } from 'react'
import { roomsApi, departmentsApi } from '../../api/services'
import { Spinner, ErrorAlert, Modal, EmptyState } from '../../components/ui'

export default function AdminRooms() {
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  // Single Add Room State
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ room_number: '', room_type: 'classroom', capacity: 40, department_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Bulk Add Room (Range) State
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    prefix: 'Room ',
    start_num: 101,
    end_num: 110,
    pad_digits: 0,
    room_type: 'classroom',
    capacity: 60,
    department_id: '',
  })
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')

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
    departmentsApi.list(true).then(r => setDepartments(r.data))
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

  const handleBulkCreate = async (e) => {
    e.preventDefault()
    setBulkError('')
    setBulkSuccess('')
    setBulkSaving(true)
    try {
      const res = await roomsApi.bulkCreate({
        prefix: bulkForm.prefix,
        start_num: Number(bulkForm.start_num),
        end_num: Number(bulkForm.end_num),
        pad_digits: Number(bulkForm.pad_digits),
        room_type: bulkForm.room_type,
        capacity: Number(bulkForm.capacity),
        department_id: bulkForm.department_id ? Number(bulkForm.department_id) : null,
      })
      setBulkSuccess(res.data.message)
      setTimeout(() => {
        setBulkModalOpen(false)
        setBulkSuccess('')
      }, 1500)
      load()
    } catch (err) {
      setBulkError(err.response?.data?.detail || 'Failed to bulk create rooms.')
    } finally {
      setBulkSaving(false)
    }
  }

  const getRangePreview = () => {
    const start = Number(bulkForm.start_num) || 0
    const end = Number(bulkForm.end_num) || 0
    if (end < start || (end - start + 1) > 200) return 'Invalid range'
    const count = end - start + 1
    const pad = Number(bulkForm.pad_digits) || 0
    const sample = []
    const limit = Math.min(count, 4)
    for (let i = 0; i < limit; i++) {
      const num = start + i
      const formatted = pad > 0 ? String(num).padStart(pad, '0') : String(num)
      sample.push(`${bulkForm.prefix}${formatted}`)
    }
    if (count > 4) sample.push('...')
    const lastNum = pad > 0 ? String(end).padStart(pad, '0') : String(end)
    if (count > 4) sample.push(`${bulkForm.prefix}${lastNum}`)
    return `${sample.join(', ')} (${count} rooms total)`
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Rooms & Labs</h1>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button onClick={() => setBulkModalOpen(true)} className="btn-secondary text-sm flex items-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <span>⚡</span> Bulk Add (Range)
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">+ Add Room</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rooms.length === 0 ? <EmptyState message="No rooms yet." /> : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm" style={{ minWidth: '480px' }}>
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

      {/* Add Single Room Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Single Room">
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

      {/* Bulk Add Rooms Modal (by Range) */}
      <Modal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Add Rooms (by Range)">
        <form onSubmit={handleBulkCreate} className="space-y-4">
          <ErrorAlert message={bulkError} />
          {bulkSuccess && (
            <div className="p-3 text-xs bg-green-50 text-green-700 rounded-md font-medium border border-green-200">
              {bulkSuccess}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prefix / Name</label>
              <input type="text" className="input" placeholder="Room " value={bulkForm.prefix} onChange={e => setBulkForm({ ...bulkForm, prefix: e.target.value })} />
              <span className="text-[10px] text-gray-400">e.g. "Room ", "Lab ", "LH-"</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zero Padding (Digits)</label>
              <select className="input" value={bulkForm.pad_digits} onChange={e => setBulkForm({ ...bulkForm, pad_digits: e.target.value })}>
                <option value="0">None (101, 102...)</option>
                <option value="2">2 digits (01, 02...)</option>
                <option value="3">3 digits (001, 002...)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Number</label>
              <input type="number" required min={1} className="input" value={bulkForm.start_num} onChange={e => setBulkForm({ ...bulkForm, start_num: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Number</label>
              <input type="number" required min={1} className="input" value={bulkForm.end_num} onChange={e => setBulkForm({ ...bulkForm, end_num: e.target.value })} />
            </div>
          </div>

          <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-900 block mb-0.5">Range Live Preview:</span>
            <span className="text-xs font-mono text-indigo-700">{getRangePreview()}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Room Type</label>
              <select className="input" value={bulkForm.room_type} onChange={e => setBulkForm({ ...bulkForm, room_type: e.target.value })}>
                <option value="classroom">Classroom</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capacity (each)</label>
              <input type="number" required min={1} className="input" value={bulkForm.capacity} onChange={e => setBulkForm({ ...bulkForm, capacity: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department (optional)</label>
            <select className="input" value={bulkForm.department_id} onChange={e => setBulkForm({ ...bulkForm, department_id: e.target.value })}>
              <option value="">None (Global Room)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setBulkModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={bulkSaving} className="btn-primary flex-1">
              {bulkSaving ? 'Generating…' : '⚡ Generate & Create Rooms'}
            </button>
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
