import { useEffect, useState, useCallback, useReducer, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { timetableApi, subjectsApi, classesApi, roomsApi, departmentsApi } from '../../api/services'
import { Spinner, Modal } from '../../components/ui'

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_ORDERS = [1, 2, 3, 4, 5, 6]
const PERIODS = [1, 2, 3, 4, 5]

const DAY_SHORT = { 1: 'DO1', 2: 'DO2', 3: 'DO3', 4: 'DO4', 5: 'DO5', 6: 'DO6' }
const DAY_FULL = { 1: 'Day Order 1', 2: 'Day Order 2', 3: 'Day Order 3', 4: 'Day Order 4', 5: 'Day Order 5', 6: 'Day Order 6' }
const PERIOD_TIMES = {
  1: '8:00–9:00',
  2: '9:00–10:00',
  3: '10:15–11:15',
  4: '11:15–12:15',
  5: '1:00–2:00',
}

const SUBJECT_COLORS = [
  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  { bg: '#FDF4FF', text: '#9333EA', border: '#E9D5FF' },
  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
  { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
]

const colorMap = {}
let colorIdx = 0
function getColor(classId) {
  if (classId === null || classId === undefined) {
    return { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' }
  }
  if (!colorMap[classId]) colorMap[classId] = SUBJECT_COLORS[colorIdx++ % SUBJECT_COLORS.length]
  return colorMap[classId]
}

function abbrev(name) {
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

function initials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

function isLabRoom(room) {
  return !!room && room.room_type === 'lab'
}

function hourTypeForRoom(roomId, rms) {
  if (!roomId) return null
  const room = rms.find(r => r.id === Number(roomId))
  if (!room) return null
  return isLabRoom(room) ? 'Lab' : 'Theory'
}

// ── History reducer ───────────────────────────────────────────────────────────
function historyReducer(state, action) {
  switch (action.type) {
    case 'SET': return { past: [...state.past.slice(-19), state.present], present: action.payload, future: [] }
    case 'UNDO': if (!state.past.length) return state
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future] }
    case 'REDO': if (!state.future.length) return state
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) }
    case 'INIT': return { past: [], present: action.payload, future: [] }
    default: return state
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="tt-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`tt-toast tt-toast--${t.type || 'success'}`}>
          <span className="tt-toast-dot" />
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconSearch = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
const IconPaint = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 20c.5-1.5 2-2.5 3.5-2.5 2 0 3.5 1.5 3.5 3.5 0 1-1 1-1 2 0 .83.67 1.5 1.5 1.5C19 24.5 22 17 22 12A10 10 0 0 0 2 12c0 2.5.6 4.7 0 8z" /></svg>
const IconUndo = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
const IconRedo = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg>
const IconTrash = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
const IconChevron = () => <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
const IconCheck = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
const IconWarning = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>

export default function MyTimetable() {
  const { user } = useAuth()
  const selectedTeacherId = String(user?.id || '')

  // ── Master data ──────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [masterReady, setMasterReady] = useState(false)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [classSearch, setClassSearch] = useState('')
  const [classDepartmentFilter, setClassDepartmentFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeClass, setActiveClass] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [paintMode, setPaintMode] = useState(false)
  const [isPainting, setIsPainting] = useState(false)
  const [paintHover, setPaintHover] = useState(null)
  const [dragClass, setDragClass] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [conflicts, setConflicts] = useState({})
  const [conflictDetail, setConflictDetail] = useState(null)
  const [toasts, setToasts] = useState([])
  const [editRoom, setEditRoom] = useState('')
  const [poppedCells, setPoppedCells] = useState(new Set())
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [quickRoomId, setQuickRoomId] = useState('')

  useEffect(() => {
    setSelectedClassId('')
    setSelectedSubjectId('')
    setSelectedRoomId('')
    if (selectedCell?.slot) {
      setEditRoom(selectedCell.slot.room_id ? String(selectedCell.slot.room_id) : '')
    } else {
      setEditRoom('')
    }
  }, [selectedCell])

  // ── Slot history ──────────────────────────────────────────────────────────
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: [], future: [] })
  const slots = history.present

  const toastId = useRef(0)
  const toast = useCallback((message, type = 'success') => {
    const id = ++toastId.current
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  // ── Enrich slot ───────────────────────────────────────────────────────────
  const enrich = useCallback((slot, subjs, clss, rms) => ({
    ...slot,
    subject_name: slot.subject_id ? (subjs.find(x => x.id === slot.subject_id)?.name || `Subject #${slot.subject_id}`) : 'Assigned',
    subject_code: slot.subject_id ? (subjs.find(x => x.id === slot.subject_id)?.code || '???') : '',
    class_name: (() => { const c = clss.find(x => x.id === slot.class_id); return c ? `${c.name}-${c.section}` : `Class #${slot.class_id}` })(),
    room_name: rms.find(x => x.id === slot.room_id)?.room_number || '',
    hour_type: hourTypeForRoom(slot.room_id, rms),
  }), [])

  // ── Load master data ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([subjectsApi.list(false, true), classesApi.list(), roomsApi.list(), departmentsApi.list(true)])
      .then(([s, c, r, d]) => {
        setSubjects(s.data); setClasses(c.data); setRooms(r.data); setDepartments(d.data)
        setMasterReady(true)
      })
      .catch(() => toast('Failed to load master data', 'error'))
  }, [toast])

  // ── Load slots ────────────────────────────────────────────────────────────
  const loadSlots = useCallback((subjs, clss, rms) => {
    if (!selectedTeacherId || !masterReady) return
    setLoading(true)
    timetableApi.getByTeacher(selectedTeacherId)
      .then(r => {
        dispatch({ type: 'INIT', payload: r.data.map(s => enrich(s, subjs, clss, rms)) })
        setSelectedCell(null); setActiveClass(null)
      })
      .catch(() => toast('Failed to load timetable', 'error'))
      .finally(() => setLoading(false))
  }, [selectedTeacherId, masterReady, enrich, toast])

  useEffect(() => {
    if (masterReady && selectedTeacherId) loadSlots(subjects, classes, rooms)
  }, [selectedTeacherId, masterReady, loadSlots, subjects, classes, rooms])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); dispatch({ type: 'UNDO' }); toast('Undone', 'warn')
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); dispatch({ type: 'REDO' }); toast('Redone', 'warn')
      } else if (e.key === 'p' || e.key === 'P') {
        setPaintMode(m => !m)
      } else if (e.key === 'Escape') {
        setActiveClass(null); setSelectedCell(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toast])

  const slotAt = (day, period) => slots.find(s => s.day_order === day && s.period_number === period)

  const showConflict = useCallback((detail, day, period) => {
    const message = typeof detail === 'string' ? detail : (detail?.reason || 'This timetable entry conflicts with an existing booking.')
    setConflicts(current => ({ ...current, [`${day}-${period}`]: { message, detail } }))
    setConflictDetail(typeof detail === 'string' ? { title: 'Timetable conflict', reason: detail } : detail)
  }, [])

  const popCell = (day, period) => {
    const key = `${day}-${period}`
    setPoppedCells(s => new Set([...s, key]))
    setTimeout(() => setPoppedCells(s => { const n = new Set(s); n.delete(key); return n }), 300)
  }

  // ── Assign slot ───────────────────────────────────────────────────────────
  const assignSlot = useCallback(async (day, period, classOverride) => {
    const sel = classOverride || activeClass
    if (!sel) return
    const occupiedSlot = slotAt(day, period)
    if (occupiedSlot) {
      toast(`${DAY_SHORT[day]} · P${period} is already occupied`, 'warn')
      return
    }
    const cls = sel.cls
    if (!cls) { toast('No class found — select a class first', 'error'); return }
    const roomId = sel.roomId !== undefined ? sel.roomId : quickRoomId
    setSaving(true)
    try {
      let res
      try {
        res = await timetableApi.createSlot({
          teacher_id: Number(selectedTeacherId),
          subject_id: null,
          class_id: cls.id,
          room_id: roomId ? Number(roomId) : null,
          day_order: day,
          period_number: period,
        })
      } catch (err1) {
        // If the backend returned a structured conflict (409), re-throw it
        // directly so the outer catch can display the full conflict dialog.
        // Only fall back to submitMyEntry for permission errors (403).
        if (err1.response?.status === 409) throw err1
        // Fallback to submission entry if approval mode active (403 means not admin)
        res = await timetableApi.submitMyEntry({
          class_id: cls.id,
          subject_id: null,
          room_id: roomId ? Number(roomId) : null,
          day_order: day,
          period_number: period,
        })
      }
      const enriched = enrich(res.data, subjects, classes, rooms)
      dispatch({ type: 'SET', payload: [...slots, enriched] })
      popCell(day, period)
      const hourTag = enriched.hour_type ? ` · ${enriched.hour_type}` : ''
      toast(`${cls.name}-${cls.section} → ${DAY_SHORT[day]} P${period}${hourTag}`)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to assign slot'
      toast(typeof detail === 'string' ? detail : (detail.title || 'Timetable conflict'), 'error')
      // Enrich conflict detail with names resolved from frontend maps
      if (detail && typeof detail === 'object') {
        if (detail.requested && !detail.requested.teacher_name) {
          detail.requested.teacher_name = user?.name || 'You'
        }
        if (detail.existing) {
          if (!detail.existing.teacher_name && detail.existing.teacher_id) {
            const t = maps?.teachers?.[detail.existing.teacher_id]
            if (t) detail.existing.teacher_name = t.name
          }
          if (!detail.existing.class_name && detail.existing.class_id) {
            const c = classes.find(cl => cl.id === detail.existing.class_id)
            if (c) detail.existing.class_name = `${c.name}-${c.section}`
          }
          if (!detail.existing.subject_name && detail.existing.subject_id) {
            const s = subjects.find(sub => sub.id === detail.existing.subject_id)
            if (s) detail.existing.subject_name = s.name
          }
        }
      }
      showConflict(detail, day, period)
    } finally { setSaving(false) }

  }, [activeClass, selectedTeacherId, slots, subjects, classes, rooms, enrich, toast, quickRoomId, showConflict])

  // ── Remove slot ───────────────────────────────────────────────────────────
  const removeSlot = useCallback(async slotObj => {
    if (!slotObj) return
    setSaving(true)
    try {
      await timetableApi.deleteSlot(slotObj.id)
      dispatch({ type: 'SET', payload: slots.filter(s => s.id !== slotObj.id) })
      setSelectedCell(null)
      toast('Slot removed', 'warn')
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to remove slot', 'error')
    } finally { setSaving(false) }
  }, [slots, toast])

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = useCallback(async () => {
    setConfirmClearOpen(false)
    setSaving(true)
    try {
      await timetableApi.clearTeacherTimetable(selectedTeacherId)
      dispatch({ type: 'INIT', payload: [] })
      setSelectedCell(null)
      toast('Timetable cleared', 'warn')
    } catch { toast('Failed to clear timetable', 'error') }
    finally { setSaving(false) }
  }, [selectedTeacherId, toast])

  // ── Update room ───────────────────────────────────────────────────────────
  const updateRoom = useCallback(async (slotObj, roomId) => {
    setSaving(true)
    try {
      await timetableApi.deleteSlot(slotObj.id)
      const res = await timetableApi.createSlot({
        teacher_id: slotObj.teacher_id, subject_id: slotObj.subject_id,
        class_id: slotObj.class_id, room_id: roomId ? Number(roomId) : null,
        day_order: slotObj.day_order, period_number: slotObj.period_number,
      })
      const updated = enrich(res.data, subjects, classes, rooms)
      dispatch({ type: 'SET', payload: slots.map(s => s.id === slotObj.id ? updated : s) })
      setSelectedCell(prev => prev ? { ...prev, slot: updated } : prev)
      toast('Room updated')
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update room', 'error')
    } finally { setSaving(false) }
  }, [slots, subjects, classes, rooms, enrich, toast])

  const handleAssignFromPanel = async () => {
    if (!selectedCell || !selectedClassId || !selectedTeacherId) return
    setSaving(true)
    try {
      const res = await timetableApi.createSlot({
        teacher_id: Number(selectedTeacherId),
        subject_id: selectedSubjectId ? Number(selectedSubjectId) : null,
        class_id: Number(selectedClassId),
        room_id: selectedRoomId ? Number(selectedRoomId) : null,
        day_order: selectedCell.day_order,
        period_number: selectedCell.period_number,
      })
      const enrichedSlot = enrich(res.data, subjects, classes, rooms)
      dispatch({ type: 'SET', payload: [...slots, enrichedSlot] })
      popCell(selectedCell.day_order, selectedCell.period_number)
      toast('Slot assigned successfully')
      setSelectedCell(null)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to assign slot'
      toast(typeof detail === 'string' ? detail : (detail.title || 'Timetable conflict'), 'error')
      // Enrich conflict detail with names resolved from frontend maps
      if (detail && typeof detail === 'object') {
        if (detail.existing) {
          if (!detail.existing.teacher_name && detail.existing.teacher_id) {
            const t = classes?.find ? null : null // teachers not a map here, look up by id
            const tObj = detail.existing.teacher_id
            // Try resolving from slots already loaded
            const knownSlot = slots.find(s => s.teacher_id === tObj)
            if (knownSlot?.teacher_name) detail.existing.teacher_name = knownSlot.teacher_name
          }
          if (!detail.existing.class_name && detail.existing.class_id) {
            const c = classes.find(cl => cl.id === detail.existing.class_id)
            if (c) detail.existing.class_name = `${c.name}-${c.section}`
          }
          if (!detail.existing.subject_name && detail.existing.subject_id) {
            const s = subjects.find(sub => sub.id === detail.existing.subject_id)
            if (s) detail.existing.subject_name = s.name
          }
        }
      }
      showConflict(detail, selectedCell.day_order, selectedCell.period_number)
    } finally {
      setSaving(false)
    }
  }


  // ── Cell click ────────────────────────────────────────────────────────────
  const handleCellClick = useCallback((day, period) => {
    const slot = slotAt(day, period)
    if (activeClass && !slot) { assignSlot(day, period); return }
    setSelectedCell({ day_order: day, period_number: period, slot })
    if (slot) setEditRoom(slot.room_id ? String(slot.room_id) : '')
  }, [activeClass, assignSlot, slots])

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDrop = useCallback((day, period) => {
    setDragOver(null)
    if (!dragClass) return
    assignSlot(day, period, dragClass)
    setDragClass(null)
  }, [dragClass, assignSlot])

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredClasses = classes.filter(c =>
    (!classDepartmentFilter || String(c.department_id) === classDepartmentFilter) &&
    (!classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase()) || (c.section || '').toLowerCase().includes(classSearch.toLowerCase())))

  const conflictRequested = conflictDetail?.requested
  const requestedTeacherName = user?.name || 'Teacher'
  const requestedClass = conflictRequested?.class_id ? classes.find(c => c.id === Number(conflictRequested.class_id)) : null
  const requestedClassName = requestedClass ? `${requestedClass.name}-${requestedClass.section}` : 'Not selected'
  const requestedSubjectName = conflictRequested?.subject_id ? (subjects.find(s => s.id === Number(conflictRequested.subject_id))?.name || `Subject #${conflictRequested.subject_id}`) : 'Assigned session'
  const requestedRoomName = conflictRequested?.room_id ? (rooms.find(r => r.id === Number(conflictRequested.room_id))?.room_number || `Room #${conflictRequested.room_id}`) : 'No room selected'

  const creditsSummary = classes
    .map(c => ({ ...c, count: slots.filter(sl => sl.class_id === c.id).length }))
    .filter(c => c.count > 0)

  return (
    <div className="tt-root">
      <Toast toasts={toasts} />


      {/* ── Header ── */}
      <header className="tt-header">
        <div className="tt-brand">
          <svg className="tt-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            <rect x="8" y="14" width="3" height="3" rx=".5" />
          </svg>
          <div>
            <h1 className="tt-title">My Timetable Editor</h1>
            <p className="tt-subtitle">
              Select a class → click or drag cells &nbsp;·&nbsp;
              <kbd className="tt-kbd">P</kbd> paint &nbsp;·&nbsp;
              <kbd className="tt-kbd">Esc</kbd> deselect
            </p>
          </div>
        </div>

        <div className="tt-controls">
          <div className="tt-action-row">
            <button
              className={`tt-btn ${paintMode ? 'tt-btn--paint-on' : 'tt-btn--paint-off'}`}
              onClick={() => setPaintMode(m => !m)}
              title="Toggle paint mode (P)"
            >
              {paintMode && <span className="tt-paint-pulse" />}
              <IconPaint />
              Paint {paintMode ? 'on' : 'off'}
            </button>

            <div className="tt-btn-group">
              <button
                className="tt-btn tt-btn--icon"
                onClick={() => { dispatch({ type: 'UNDO' }); toast('Undone', 'warn') }}
                disabled={!history.past.length}
                title="Undo (Ctrl+Z)"
              ><IconUndo /></button>
              <button
                className="tt-btn tt-btn--icon"
                onClick={() => { dispatch({ type: 'REDO' }); toast('Redone', 'warn') }}
                disabled={!history.future.length}
                title="Redo (Ctrl+Y)"
              ><IconRedo /></button>
            </div>

            {slots.length > 0 && (
              <button
                className="tt-btn tt-btn--danger"
                onClick={() => setConfirmClearOpen(true)}
                disabled={saving}
                title="Clear all slots"
              >
                <IconTrash /> Clear all
              </button>
            )}

            {saving && (
              <span className="tt-saving">
                <span className="tt-saving-dot" /> Saving…
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Three-panel body ── */}
      <div className="tt-body">

        {/* ── LEFT: class panel ── */}
        <aside className="tt-left">
          <div className="tt-input-icon-wrap" style={{ width: '100%' }}>
            <IconSearch />
            <input
              className="tt-input tt-input--icon tt-input--sm"
              placeholder="Filter classes…"
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <select
            className="tt-select"
            value={classDepartmentFilter}
            onChange={e => setClassDepartmentFilter(e.target.value)}
            style={{ width: '100%', marginTop: 8 }}
          >
            <option value="">All departments</option>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>

          <div className="tt-panel-label">
            Classes
            <span className="tt-badge">{classes.length}</span>
          </div>

          {/* Class cards */}
          <div className="tt-subject-list">
            {filteredClasses.map(c => {
              const color = getColor(c.id)
              const isActive = activeClass?.cls?.id === c.id
              const slotCount = slots.filter(sl => sl.class_id === c.id).length
              const subjectCount = subjects.filter(s => s.class_id === c.id).length

              return (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDragClass({ cls: c, color })}
                  onDragEnd={() => setDragClass(null)}
                  onClick={() => setActiveClass(isActive ? null : { cls: c, color })}
                  className={`tt-subject-card ${isActive ? 'tt-subject-card--active' : ''}`}
                  style={{ '--sc': color.border, '--sc-bg': color.bg, '--sc-text': color.text }}
                >
                  <div className="sc-stripe" />
                  <div className="sc-body">
                    <div className="sc-code">{c.name}-{c.section}</div>
                    {subjectCount > 0 && (
                      <div className="sc-name">{subjectCount} subject{subjectCount !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                  {slotCount > 0 && (
                    <div className="sc-count" style={{ color: isActive ? color.text : undefined }}>
                      {slotCount}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredClasses.length === 0 && (
              <div className="tt-empty-list">No classes found</div>
            )}
          </div>

          <div className="tt-panel-label" style={{ marginTop: 4 }}>Assign as</div>
          <div className="tt-quickroom-row">
            <button
              type="button"
              className={`tt-quickroom-chip ${!quickRoomId ? 'tt-quickroom-chip--active' : ''}`}
              onClick={() => setQuickRoomId('')}
              title="Assign without a room (Theory hour)"
            >
              Theory
            </button>
            {rooms.filter(isLabRoom).map(r => (
              <button
                key={r.id}
                type="button"
                className={`tt-quickroom-chip tt-quickroom-chip--lab ${quickRoomId === String(r.id) ? 'tt-quickroom-chip--active' : ''}`}
                onClick={() => setQuickRoomId(String(r.id))}
                title={`Assign in ${r.room_number} (Lab hour)`}
              >
                {r.room_number}
              </button>
            ))}
          </div>

          {activeClass && (
            <div className="tt-active-hint" style={{ '--hint-border': activeClass.color.border, '--hint-bg': activeClass.color.bg, '--hint-text': activeClass.color.text }}>
              <IconCheck />
              <span>
                <strong>{activeClass.cls.name}-{activeClass.cls.section}</strong> selected — click empty cells to assign
                {' '}as {quickRoomId ? <><strong>Lab</strong> ({rooms.find(r => r.id === Number(quickRoomId))?.room_number})</> : <strong>Theory</strong>}
              </span>
            </div>
          )}
        </aside>

        {/* ── CENTER: grid ── */}
        <main
          className={`tt-center ${paintMode && activeClass ? 'tt-center--paint' : ''}`}
          onMouseDown={() => { if (paintMode) setIsPainting(true) }}
          onMouseUp={() => setIsPainting(false)}
          onMouseLeave={() => { setIsPainting(false); setPaintHover(null) }}
        >
          {loading ? (
            <div className="tt-loading">
              <Spinner />
              <span>Loading schedule…</span>
            </div>
          ) : (
            <div className="tt-grid-wrapper">
              <div className="tt-grid-head">
                <div className="tt-corner" />
                {PERIODS.map(p => (
                  <div key={p} className="tt-period-head">
                    <span className="ph-num">Period {p}</span>
                    <span className="ph-time">{PERIOD_TIMES[p]}</span>
                  </div>
                ))}
              </div>

              {DAY_ORDERS.map(day => (
                <div key={day} className="tt-grid-row">
                  <div className="tt-day-label">
                    <span className="dl-short">{DAY_SHORT[day]}</span>
                    <span className="dl-full">{DAY_FULL[day]}</span>
                  </div>

                  {PERIODS.map(period => {
                    const slot = slotAt(day, period)
                    const color = slot ? getColor(slot.class_id) : null
                    const isSelected = selectedCell?.day_order === day && selectedCell?.period_number === period
                    const isDragOver = dragOver?.day === day && dragOver?.period === period
                    const isPaintHov = paintHover?.day === day && paintHover?.period === period
                    const conflict = conflicts[`${day}-${period}`]
                    const isPopped = poppedCells.has(`${day}-${period}`)

                    let cellBg = '#FAFAFA'
                    if (slot) cellBg = isSelected ? (color?.border || '#E5E7EB') : (color?.bg || '#F9FAFB')
                    else if (isDragOver) cellBg = '#EEF2FF'
                    else if (isPaintHov && activeClass) cellBg = '#F5F3FF'
                    else if (isSelected) cellBg = '#F0F9FF'

                    let borderColor = '#E4E7EC'
                    if (conflict) borderColor = '#EF4444'
                    else if (isSelected) borderColor = color?.border || '#6366F1'
                    else if (isDragOver) borderColor = '#818CF8'
                    else if (slot) borderColor = color?.border || '#E4E7EC'

                    return (
                      <div
                        key={period}
                        className={[
                          'tt-cell',
                          slot ? 'tt-cell--filled' : 'tt-cell--empty',
                          isSelected ? 'tt-cell--selected' : '',
                          isDragOver ? 'tt-cell--drag-over' : '',
                          conflict ? 'tt-cell--conflict' : '',
                          isPopped ? 'tt-cell--pop' : '',
                        ].join(' ')}
                        style={{
                          '--cb': cellBg,
                          '--cbr': borderColor,
                          '--ct': color?.text || '#374151',
                          '--csel': color?.border || '#818CF8',
                        }}
                        onClick={() => handleCellClick(day, period)}
                        onMouseEnter={() => {
                          setPaintHover({ day, period })
                          if (paintMode && isPainting && activeClass && !slot) assignSlot(day, period)
                        }}
                        onMouseLeave={() => setPaintHover(null)}
                        onDragOver={e => { e.preventDefault(); setDragOver({ day, period }) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(day, period)}
                        title={conflict || (slot ? `${slot.subject_id ? slot.subject_name : 'Assigned'} · ${slot.class_name}` : `${DAY_SHORT[day]} · Period ${period}`)}
                      >
                        {slot && color && (
                          <div className="cell-top-bar" style={{ background: color.border }} />
                        )}

                        {slot ? (
                          <div className="cell-content">
                            <span className="cell-code">{slot.subject_id ? (slot.subject_code || abbrev(slot.subject_name)) : "Assigned"}</span>
                            <span className="cell-class">{slot.class_name}</span>
                            {slot.room_name && <span className="cell-room">{slot.room_name}</span>}
                            {slot.hour_type && (
                              <span className={`cell-hour-badge cell-hour-badge--${slot.hour_type.toLowerCase()}`}>
                                {slot.hour_type}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="cell-plus">
                            {isDragOver ? '↓' : '+'}
                          </span>
                        )}

                        {conflict && <span className="cell-conflict-dot" />}
                      </div>
                    )
                  })}
                </div>
              ))}

              {creditsSummary.length > 0 && (
                <div className="tt-credits">
                  <span className="credits-label">Slots assigned</span>
                  <div className="credits-chips">
                    {creditsSummary.map(c => {
                      const color = getColor(c.id)
                      return (
                        <span key={c.id} className="credit-chip"
                          style={{ '--chip-bg': color.bg, '--chip-border': color.border, '--chip-text': color.text }}>
                          <strong>{c.name}-{c.section}</strong>&nbsp;·&nbsp;{c.count}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── RIGHT: detail panel ── */}
        <aside className="tt-right">
          <div className="tt-teacher-card">
            <div className="teacher-avatar">
              {initials(user?.name)}
            </div>
            <div className="teacher-info">
              <div className="teacher-name">{user?.name}</div>
              <div className="teacher-slots">{slots.length} slot{slots.length !== 1 ? 's' : ''} assigned</div>
            </div>
          </div>

          {selectedCell ? (
            <div className="tt-cell-detail">
              <div className="cd-chips">
                <span className="cd-chip cd-chip--day">{DAY_SHORT[selectedCell.day_order]}</span>
                <span className="cd-chip cd-chip--period">Period {selectedCell.period_number}</span>
                <span className="cd-chip cd-chip--time">{PERIOD_TIMES[selectedCell.period_number]}</span>
              </div>

              {selectedCell.slot ? (
                <>
                  <div className="cd-subject">{selectedCell.slot.subject_name}</div>
                  <div className="cd-class">{selectedCell.slot.class_name}</div>

                  <div className="cd-section">
                    <label className="cd-label">
                      Room
                      {(() => {
                        const ht = hourTypeForRoom(editRoom, rooms)
                        return ht ? (
                          <span className={`cd-hour-chip cd-hour-chip--${ht.toLowerCase()}`}>{ht} hour</span>
                        ) : null
                      })()}
                    </label>
                    <input
                      className="tt-input tt-input--sm"
                      placeholder="Filter rooms…"
                      value={roomFilter}
                      onChange={e => setRoomFilter(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', marginBottom: 5 }}
                    />
                    <select
                      className="tt-select tt-select--sm"
                      value={editRoom}
                      onChange={e => {
                        setEditRoom(e.target.value)
                        updateRoom(selectedCell.slot, e.target.value)
                      }}
                      disabled={saving}
                      style={{ width: '100%' }}
                    >
                      <option value="">No room assigned (Theory)</option>
                      {rooms
                        .filter(r => !roomFilter || r.room_number.toLowerCase().includes(roomFilter.toLowerCase()))
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.room_number} ({r.room_type === 'lab' ? 'Lab' : 'Classroom'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="cd-actions">
                    <button
                      className="tt-btn tt-btn--danger tt-btn--full"
                      onClick={() => removeSlot(selectedCell.slot)}
                      disabled={saving}
                    >
                      <IconTrash /> Remove slot
                    </button>
                  </div>
                </>
              ) : (
                <div className="cd-empty-assign">
                  <p className="cd-assign-title">Assign slot to this cell</p>
                  <p className="cd-assign-desc font-xs text-slate-500">Pick details below to assign to {DAY_SHORT[selectedCell.day_order]} P{selectedCell.period_number}:</p>
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Select Class *</label>
                      <select
                        className="input text-xs"
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                      >
                        <option value="">Choose class…</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Select Subject (Optional)</label>
                      <select
                        className="input text-xs"
                        value={selectedSubjectId}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                      >
                        <option value="">Choose subject…</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Select Room (Optional)</label>
                      <select
                        className="input text-xs"
                        value={selectedRoomId}
                        onChange={e => setSelectedRoomId(e.target.value)}
                      >
                        <option value="">No room assigned (Theory)</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} ({r.room_type === 'lab' ? 'Lab' : 'Classroom'})</option>)}
                      </select>
                    </div>

                    <button
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold w-full transition-colors cursor-pointer"
                      disabled={!selectedClassId || saving}
                      onClick={handleAssignFromPanel}
                    >
                      {saving ? 'Assigning…' : 'Assign Slot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="tt-no-cell">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>Click any cell to inspect or assign details</span>
            </div>
          )}
        </aside>

      </div>

      {/* Clear confirmation modal */}
      {confirmClearOpen && (
        <Modal open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)} title="Clear Timetable?">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to clear all slots for your timetable? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </button>
              <button className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700" onClick={clearAll}>
                Yes, Clear All
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Conflict Modal Dialog */}
      <Modal open={!!conflictDetail} onClose={() => setConflictDetail(null)} title={conflictDetail?.title || 'Timetable conflict'}>
        <div className="tt-conflict-dialog">
          <div className="conflict-reason">
            <IconWarning />
            <div><strong>Why this happened</strong><p>{conflictDetail?.reason || 'This entry overlaps an existing timetable booking.'}</p></div>
          </div>
          <div className="conflict-time">
            {DAY_FULL[conflictRequested?.day_order] || 'Selected day'} · Period {conflictRequested?.period_number || '—'}
            {conflictRequested?.period_number && ` (${PERIOD_TIMES[conflictRequested.period_number]})`}
          </div>
          <div className="conflict-comparison">
            <section>
              <h4>Entry you tried to add</h4>
              <p><span>Teacher</span>{requestedTeacherName}</p>
              <p><span>Class</span>{requestedClassName}</p>
              <p><span>Subject</span>{requestedSubjectName}</p>
              <p><span>Room</span>{requestedRoomName}</p>
            </section>
            <section className="conflict-existing">
              <h4>Existing entry causing the conflict</h4>
              <p><span>Teacher</span>{conflictDetail?.existing?.teacher_name || `Teacher #${conflictDetail?.existing?.teacher_id || '—'}`}</p>
              <p><span>Class</span>{conflictDetail?.existing?.class_name || 'Unknown class'}</p>
              <p><span>Subject</span>{conflictDetail?.existing?.subject_name || 'Assigned session'}</p>
              <p><span>Room</span>{conflictDetail?.existing?.room_name || 'No room selected'}</p>
            </section>
          </div>
          <div className="conflict-resolution"><strong>How to fix it</strong><p>{conflictDetail?.resolution || 'Choose a different class, room, day order, or period.'}</p></div>
          <button type="button" className="tt-btn tt-btn--primary" onClick={() => setConflictDetail(null)} style={{ width: '100%', justifyContent: 'center' }}>I understand — adjust timetable</button>
        </div>
      </Modal>

      <style>{CSS}</style>
    </div>
  )
}


// ── Styles ────────────────────────────────────────────────────────────────────
const CSS = `
/* ─── Animations ─────────────────────────────────────────────────────────── */
@keyframes ttSlide   { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes ttPop     { 0%,100% { transform:scale(1) } 45% { transform:scale(1.07) } }
@keyframes ttPulse   { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.45; transform:scale(1.5) } }
@keyframes ttPaintPulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }

/* ─── Root ───────────────────────────────────────────────────────────────── */
.tt-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  min-height: 550px;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  background: #F7F8FC;
  color: #1E2532;
  font-size: 13px;
  line-height: 1.4;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.tt-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: #fff;
  border-bottom: 1px solid #E8EBEF;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.tt-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 150px;
}

.tt-brand-icon {
  width: 24px;
  height: 24px;
  color: #4F46E5;
  flex-shrink: 0;
}

.tt-title {
  font-size: 16px;
  font-weight: 700;
  color: #1E2532;
  margin: 0;
  letter-spacing: -0.3px;
}

.tt-subtitle {
  font-size: 11px;
  color: #94A3B8;
  margin: 2px 0 0;
  line-height: 1;
}

.tt-kbd {
  display: inline-block;
  padding: 1px 5px;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  font-size: 10px;
  font-family: inherit;
  color: #64748B;
}

.tt-controls {
  display: flex;
  flex-direction: column;
  gap: 7px;
  align-items: flex-end;
}

.tt-search-row,
.tt-action-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* ─── Input / Select ─────────────────────────────────────────────────────── */
.tt-input-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.tt-input-icon-wrap svg {
  position: absolute;
  left: 9px;
  color: #94A3B8;
  pointer-events: none;
}

.tt-input {
  padding: 7px 10px;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  font-size: 12px;
  color: #334155;
  background: #fff;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}

.tt-input--icon { padding-left: 28px; }
.tt-input--sm   { padding: 5px 8px; font-size: 11px; border-radius: 7px; }

.tt-input:focus {
  border-color: #818CF8;
  box-shadow: 0 0 0 3px #EEF2FF;
}

.tt-select {
  padding: 7px 10px;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  font-size: 12px;
  color: #334155;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color .15s;
}

.tt-select:focus { border-color: #818CF8; }
.tt-select--sm   { padding: 5px 8px; font-size: 11px; border-radius: 7px; }

/* ─── Buttons ────────────────────────────────────────────────────────────── */
.tt-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .14s;
  white-space: nowrap;
  font-family: inherit;
}

.tt-btn:hover:not(:disabled) { background: #F8FAFC; border-color: #C9D3DD; color: #1E2532; }
.tt-btn:disabled { opacity: .38; cursor: not-allowed; }

.tt-btn--paint-off { color: #475569; }
.tt-btn--paint-on  { background: #EEF2FF; border-color: #818CF8; color: #4338CA; }

.tt-paint-pulse {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366F1;
  animation: ttPaintPulse 1.2s ease-in-out infinite;
}

.tt-btn--icon {
  padding: 6px 9px;
}

.tt-btn--danger {
  background: #FEF2F2;
  border-color: #FECACA;
  color: #DC2626;
}

.tt-btn--danger:hover:not(:disabled) { background: #FEE2E2; border-color: #FCA5A5; }

.tt-btn--primary {
  background: #4F46E5;
  border-color: #4F46E5;
  color: #fff;
  justify-content: center;
}

.tt-btn--primary:hover:not(:disabled) {
  background: #4338CA;
  border-color: #4338CA;
  color: #fff;
}

.tt-btn-group {
  display: flex;
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  overflow: hidden;
}

.tt-btn-group .tt-btn {
  border-radius: 0;
  border: none;
  border-right: 1px solid #E4E7EC;
}

.tt-btn-group .tt-btn:last-child { border-right: none; }

.tt-saving {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94A3B8;
  padding: 5px 9px;
  background: #F8FAFC;
  border-radius: 7px;
  border: 1px solid #E4E7EC;
}

.tt-saving-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94A3B8;
  animation: ttPaintPulse 1s ease-in-out infinite;
}

/* ─── Body ───────────────────────────────────────────────────────────────── */
.tt-body {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 14px 16px;
}

/* ─── Left panel ─────────────────────────────────────────────────────────── */
.tt-left {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  padding-right: 2px;
}

.tt-panel-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: .08em;
  padding: 2px 0;
}

.tt-badge {
  background: #F1F5F9;
  color: #64748B;
  border-radius: 99px;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 700;
}

.tt-subject-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.tt-subject-card {
  display: flex;
  align-items: stretch;
  border-radius: 10px;
  border: 1.5px solid #E8EBEF;
  background: #fff;
  cursor: grab;
  overflow: hidden;
  transition: border-color .12s, transform .1s, box-shadow .12s;
  box-shadow: 0 1px 2px rgba(30,37,50,.04);
  user-select: none;
}

.tt-subject-card:hover {
  border-color: var(--sc);
  box-shadow: 0 3px 8px rgba(30,37,50,.08);
  transform: translateY(-1px);
}

.tt-subject-card--active {
  background: var(--sc-bg);
  border-color: var(--sc);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sc) 30%, transparent);
  transform: translateY(-1px);
}

.sc-stripe {
  width: 4px;
  background: var(--sc);
  flex-shrink: 0;
}

.sc-body {
  flex: 1;
  padding: 8px 10px;
  min-width: 0;
}

.sc-code {
  font-size: 12px;
  font-weight: 700;
  color: #1E2532;
  font-family: 'SF Mono', 'Fira Mono', monospace;
  letter-spacing: .01em;
}

.tt-subject-card--active .sc-code { color: var(--sc-text); }

.sc-name {
  font-size: 10px;
  color: #64748B;
  margin-top: 2px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sc-count {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: #D1D5DB;
  min-width: 30px;
}

.tt-empty-list {
  font-size: 11px;
  color: #94A3B8;
  text-align: center;
  padding: 14px 0;
}

.tt-quickroom-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}

.tt-quickroom-chip {
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1.5px solid #E4E7EC;
  background: #fff;
  color: #64748B;
  cursor: pointer;
  transition: all .12s;
}

.tt-quickroom-chip:hover { border-color: #C7D2FE; color: #4F46E5; }

.tt-quickroom-chip--active {
  background: #EEF2FF;
  border-color: #6366F1;
  color: #4338CA;
}

.tt-quickroom-chip--lab.tt-quickroom-chip--active {
  background: #FFFBEB;
  border-color: #F59E0B;
  color: #B45309;
}

.tt-active-hint {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 11px;
  background: var(--hint-bg, #EEF2FF);
  border: 1px solid var(--hint-border, #C7D2FE);
  border-radius: 9px;
  font-size: 11px;
  color: var(--hint-text, #4338CA);
  line-height: 1.5;
  margin-top: 2px;
  flex-shrink: 0;
}

.tt-active-hint svg { margin-top: 1px; flex-shrink: 0; }

/* ─── Center ────────────────────────────────────────────────────────────── */
.tt-center {
  flex: 1;
  min-width: 0;
  overflow: auto;
  cursor: default;
}

.tt-center--paint { cursor: crosshair; }

.tt-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  color: #94A3B8;
  font-size: 12px;
}

/* ─── Grid ───────────────────────────────────────────────────────────────── */
.tt-grid-wrapper { min-width: 440px; }

.tt-grid-head,
.tt-grid-row {
  display: grid;
  grid-template-columns: 78px repeat(5, 1fr);
  gap: 5px;
  margin-bottom: 5px;
}

.tt-corner { }

.tt-period-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  background: #fff;
  border: 1px solid #E8EBEF;
  border-radius: 8px;
  gap: 2px;
}

.ph-num  { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: .05em; }
.ph-time { font-size: 9px; color: #94A3B8; font-family: 'SF Mono', 'Fira Mono', monospace; }

.tt-day-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #E8EBEF;
  border-radius: 9px;
  height: 84px;
  gap: 1px;
}

.dl-short { font-size: 13px; font-weight: 700; color: #334155; }
.dl-full  { font-size: 8px; color: #94A3B8; letter-spacing: .04em; text-transform: uppercase; }

/* ─── Cell ───────────────────────────────────────────────────────────────── */
.tt-cell {
  position: relative;
  height: 84px;
  background: var(--cb, #FAFAFA);
  border: 2px solid var(--cbr, #E4E7EC);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  transition: transform .1s ease, box-shadow .1s ease;
}

.tt-cell:hover { transform: scale(1.025); }

.tt-cell--selected {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--csel, #818CF8) 30%, transparent);
}

.tt-cell--drag-over { border-style: dashed; }
.tt-cell--pop { animation: ttPop .28s ease; }

.cell-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 8px 8px 0 0;
  opacity: .8;
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 5px;
  width: 100%;
}

.cell-code {
  font-size: 13px;
  font-weight: 800;
  color: var(--ct, #374151);
  font-family: 'SF Mono', 'Fira Mono', monospace;
  letter-spacing: .03em;
}

.cell-class {
  font-size: 9px;
  color: #6B7280;
  text-align: center;
  line-height: 1.2;
}

.cell-room {
  font-size: 8px;
  color: #9CA3AF;
  margin-top: 1px;
}

.cell-hour-badge {
  font-size: 7px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 1px 5px;
  border-radius: 999px;
  margin-top: 2px;
}

.cell-hour-badge--theory { background: #EFF6FF; color: #1D4ED8; }
.cell-hour-badge--lab    { background: #FFFBEB; color: #B45309; }

.cell-plus {
  font-size: 20px;
  color: #D1D5DB;
  font-weight: 300;
  transition: all .1s;
  line-height: 1;
}

.tt-cell--drag-over .cell-plus { color: #818CF8; font-size: 22px; }

.cell-conflict-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #EF4444;
  animation: ttPulse 1.4s ease-in-out infinite;
}

/* ─── Credits ────────────────────────────────────────────────────────────── */
.tt-credits {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid #E8EBEF;
  border-radius: 9px;
  flex-wrap: wrap;
}

.credits-label {
  font-size: 10px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: .07em;
  white-space: nowrap;
}

.credits-chips { display: flex; flex-wrap: wrap; gap: 5px; }

.credit-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--chip-bg);
  border: 1px solid var(--chip-border);
  font-size: 10px;
  color: var(--chip-text);
  font-weight: 500;
}

/* ─── Right panel ────────────────────────────────────────────────────────── */
.tt-right {
  width: 224px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-left: 2px;
}

.tt-teacher-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 13px;
  background: #fff;
  border: 1px solid #E8EBEF;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(30,37,50,.04);
  flex-shrink: 0;
}

.teacher-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #818CF8 0%, #6366F1 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(99,102,241,.35);
}

.teacher-name  { font-size: 13px; font-weight: 700; color: #1E2532; }
.teacher-slots { font-size: 10px; color: #94A3B8; margin-top: 5px; }

.tt-cell-detail {
  padding: 13px;
  background: #fff;
  border: 1px solid #E8EBEF;
  border-radius: 12px;
  flex: 1;
  min-height: 0;
}

.cd-chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.cd-chip {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.cd-chip--day    { background: #EEF2FF; color: #4F46E5; }
.cd-chip--period { background: #F1F5F9; color: #475569; }
.cd-chip--time   { background: #F8FAFC; color: #94A3B8; font-family: 'SF Mono','Fira Mono',monospace; font-size: 10px; }

.cd-subject { font-size: 14px; font-weight: 700; color: #1E2532; line-height: 1.3; }
.cd-class   { font-size: 11px; color: #64748B; margin-top: 3px; }
.cd-section { margin-top: 14px; }

.cd-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 6px;
}

.cd-hour-chip {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.cd-hour-chip--theory { background: #EFF6FF; color: #1D4ED8; }
.cd-hour-chip--lab    { background: #FFFBEB; color: #B45309; }

.tt-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 13px;
  width: 100%;
  padding: 8px 0;
  border-radius: 8px;
  border: 1px solid #FECACA;
  background: #FEF2F2;
  color: #DC2626;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .14s;
  font-family: inherit;
}

.tt-no-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: #FAFAFA;
  border: 1.5px dashed #E4E7EC;
  border-radius: 12px;
  color: #CBD5E1;
  font-size: 12px;
  text-align: center;
  gap: 10px;
  line-height: 1.6;
}

.tt-toast-wrap {
  position: fixed;
  bottom: 22px;
  right: 22px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 7px;
  pointer-events: none;
}

.tt-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 4px 18px rgba(0,0,0,.13);
  animation: ttSlide .2s ease;
  max-width: 300px;
  border: 1px solid #A7F3D0;
  background: #ECFDF5;
  color: #065F46;
}

.tt-toast-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10B981;
  flex-shrink: 0;
}

.tt-toast--error { background:#FEF2F2; color:#991B1B; border-color:#FECACA; }
.tt-toast--error .tt-toast-dot { background:#EF4444; }
.tt-toast--warn  { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
.tt-toast--warn  .tt-toast-dot { background:#F59E0B; }

/* ─── Conflict Dialog ─── */
.conflicts-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #991B1B;
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 7px;
}

.conflict-item {
  font-size: 10px;
  color: #DC2626;
  margin-bottom: 4px;
  line-height: 1.45;
}
.conflict-view-btn { border: 0; background: transparent; color: #B91C1C; padding: 0 0 0 5px; font-size: 10px; font-weight: 700; cursor: pointer; text-decoration: underline; }
.tt-conflict-dialog { padding: 4px; color: #374151; }
.conflict-reason { display: flex; gap: 10px; padding: 12px; border: 1px solid #FECACA; background: #FEF2F2; border-radius: 10px; color: #991B1B; }
.conflict-reason svg { width: 21px; height: 21px; flex: 0 0 auto; }
.conflict-reason strong, .conflict-resolution strong { display: block; font-size: 13px; }
.conflict-reason p, .conflict-resolution p { margin: 3px 0 0; font-size: 12px; line-height: 1.45; }
.conflict-time { margin: 12px 0; padding: 9px 11px; border-radius: 8px; background: #F3F4F6; font-size: 12px; font-weight: 700; color: #374151; }
.conflict-comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.conflict-comparison section { border: 1px solid #DBEAFE; background: #F8FBFF; border-radius: 10px; padding: 10px; }
.conflict-comparison .conflict-existing { border-color: #FECACA; background: #FFF8F8; }
.conflict-comparison h4 { margin: 0 0 8px; font-size: 11px; color: #1D4ED8; }
.conflict-existing h4 { color: #B91C1C; }
.conflict-comparison p { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; font-size: 11px; font-weight: 600; }
.conflict-comparison p span { color: #6B7280; font-weight: 500; }
.conflict-resolution { margin: 12px 0; padding: 10px 12px; border-left: 3px solid #2563EB; background: #EFF6FF; border-radius: 0 8px 8px 0; color: #1E3A8A; }
@media (max-width: 560px) { .conflict-comparison { grid-template-columns: 1fr; } }
`


