import { useState, useRef, useCallback, useEffect } from 'react'
import { timetableApi, teachersApi, classesApi, subjectsApi, roomsApi, departmentsApi } from '../../api/services'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = '#4F46E5', icon }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: color + '18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justify_content: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{value}%</span>
      </div>
      <div style={{
        height: 8,
        background: '#E5E7EB',
        borderRadius: 99,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ file, onFile, disabled, accept = ".xlsx,.xls", label = "Excel spreadsheet (.xlsx, .xls)" }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onFile(dropped)
  }, [disabled, onFile])

  const handleDragOver = (e) => { e.preventDefault(); if (!disabled) setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleClick = () => { if (!disabled) inputRef.current?.click() }
  const handleChange = (e) => { const f = e.target.files?.[0]; if (f) onFile(f) }

  const isAccepted = file && accept.split(',').some(ext => file.name.endsWith(ext.trim()))
  const isInvalid = file && !isAccepted

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: `2px dashed ${dragging ? '#4F46E5' : isInvalid ? '#EF4444' : file ? '#22C55E' : '#D1D5DB'}`,
        borderRadius: 12,
        padding: '30px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? '#EEF2FF' : file ? '#F0FDF4' : '#FAFAFA',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {/* Icon */}
      <div style={{ fontSize: 32, marginBottom: 10 }}>
        {isInvalid ? '❌' : file ? '✅' : accept.includes('json') ? '📄' : '📊'}
      </div>

      {file ? (
        <>
          <div style={{ fontWeight: 600, color: isInvalid ? '#DC2626' : '#166534', fontSize: 13 }}>
            {file.name}
          </div>
          <div style={{ fontSize: 11, color: isInvalid ? '#EF4444' : '#6B7280', marginTop: 4 }}>
            {isInvalid ? `Unsupported file format. Please upload ${label}.` : `File ready: ${(file.size / 1024).toFixed(1)} KB`}
          </div>
          {!disabled && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Click to choose a different file</div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>
            Drag & drop your {accept.includes('json') ? 'JSON file' : 'timetable Excel'} here
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            or click to browse — accepts {label}
          </div>
          {!accept.includes('json') && (
            <div style={{
              marginTop: 10,
              display: 'inline-block',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              padding: '2px 10px',
              fontSize: 11,
              color: '#6B7280',
            }}>
              Sheet required: <strong>CS-STAFF</strong>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimetableImport() {
  const [step, setStep] = useState(1) // 1: Upload, 2: Preview & Map, 3: Success
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | preview | committing | done | error
  const [previewRows, setPreviewRows] = useState([])
  const [summary, setSummary] = useState({ total_slots: 0, resolved_slots: 0, needs_review_slots: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  // JSON Import States
  const [importSource, setImportSource] = useState('excel') // 'excel' | 'json'
  const [jsonText, setJsonText] = useState('')
  const [promptTemplate, setPromptTemplate] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState('')
  const [jsonFile, setJsonFile] = useState(null)

  // Master lists for mapping dropdowns
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [semesterForNewClasses, setSemesterForNewClasses] = useState(null)

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all | needs_review | resolved

  const isExcelFile = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))
  const canPreview = isExcelFile && status !== 'uploading'

  // Fetch master data on load
  useEffect(() => {
    Promise.all([
      teachersApi.list(),
      classesApi.list(),
      subjectsApi.list(),
      roomsApi.list(),
      departmentsApi.list()
    ]).then(([teachersRes, classesRes, subjectsRes, roomsRes, departmentsRes]) => {
      // Sort teachers alphabetically by name
      const sortedTeachers = [...teachersRes.data].sort((a, b) => a.name.localeCompare(b.name))
      setTeachers(sortedTeachers)
      setClasses(classesRes.data)
      setSubjects(subjectsRes.data)
      setRooms(roomsRes.data)
      setDepartments(departmentsRes.data)
    }).catch(err => {
      console.error("Failed to load master lookup lists", err)
    })
  }, [])

  // Fetch JSON AI Prompt Template when JSON source is active
  useEffect(() => {
    if (importSource === 'json' && !promptTemplate) {
      setPromptLoading(true)
      setPromptError('')
      timetableApi.getJsonPromptTemplate()
        .then(res => {
          setPromptTemplate(res.data)
        })
        .catch(err => {
          console.error("Failed to load prompt template", err)
          setPromptError("Couldn't load the prompt template — try refreshing.")
        })
        .finally(() => {
          setPromptLoading(false)
        })
    }
  }, [importSource, promptTemplate])

  const handleCopyPrompt = () => {
    if (promptTemplate) {
      navigator.clipboard.writeText(promptTemplate)
        .then(() => alert("Prompt template copied to clipboard!"))
        .catch(err => console.error("Could not copy text: ", err))
    }
  }

  const handleJsonFileSelect = (f) => {
    if (!f) return
    if (!f.name.endsWith('.json')) {
      setErrorMsg("Please upload a valid .json file.")
      return
    }
    setErrorMsg('')
    setJsonFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target.result
        // Verify it's parseable JSON
        JSON.parse(content)
        setJsonText(content)
      } catch (err) {
        setErrorMsg("Uploaded file is not valid JSON.")
      }
    }
    reader.readAsText(f)
  }

  // ── Step 1: Upload & Preview ────────────────────────────────────────────────
  const handlePreview = async () => {
    setErrorMsg('')
    setProgress(0)

    if (importSource === 'excel') {
      if (!canPreview) return
      setStatus('uploading')
      try {
        const response = await timetableApi.previewImportExcel(file, (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 90))
          }
        })
        setProgress(100)
        await new Promise(r => setTimeout(r, 200))
        setPreviewRows(response.data.rows)
        setSummary(response.data.summary)
        setStep(2)
        setStatus('preview')
      } catch (err) {
        const detail = err.response?.data?.detail || err.message || 'Excel preview failed.'
        setErrorMsg(detail)
        setStatus('error')
        setProgress(0)
      }
    } else {
      if (!jsonText.trim()) {
        setErrorMsg("Please paste or upload JSON data to preview.")
        return
      }

      let parsedPayload = null
      try {
        parsedPayload = JSON.parse(jsonText)
      } catch (err) {
        setErrorMsg(`Malformed JSON: ${err.message}. Please verify syntax before previewing.`)
        return
      }

      setStatus('uploading')
      setProgress(50)

      try {
        const response = await timetableApi.previewImportJson(parsedPayload)
        setProgress(100)
        await new Promise(r => setTimeout(r, 200))
        setPreviewRows(response.data.rows)
        setSummary(response.data.summary)
        setStep(2)
        setStatus('preview')
      } catch (err) {
        const detail = err.response?.data?.detail || err.message || 'JSON preview failed.'
        setErrorMsg(detail)
        setStatus('error')
        setProgress(0)
      }
    }
  }

  const extractYearSection = (text) => {
    if (!text) return { year: null, section: null }
    const cleaned = text.replace(/([A-Za-z0-9])\-([A-Za-z0-9])/g, '$1 $2')
    const tokens = cleaned.split(/[-—\s]+/).map(t => t.trim()).filter(Boolean)
    
    const romanYears = new Set(["I", "II", "III", "IV", "V"])
    let year = null
    let section = null
    
    for (const t of tokens) {
      const ut = t.toUpperCase()
      if (romanYears.has(ut)) {
        year = ut
        break
      }
    }
    
    for (const t of tokens) {
      const ut = t.toUpperCase()
      if (ut.length === 1 && /[A-Z]/.test(ut)) {
        if (ut !== year) {
          section = ut
          break
        }
      }
    }
    
    return { year, section }
  }

  const extractDepartmentTokenFromClassText = (classText) => {
    if (!classText) return ""
    const tokens = classText.split(/[-—\s]+/).map(t => t.trim()).filter(Boolean)
    const romanYears = new Set(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"])
    const deptParts = []
    for (const t of tokens) {
      const ut = t.toUpperCase()
      if (romanYears.has(ut)) continue
      if (ut.length === 1 && /[A-Z]/.test(ut)) continue
      if (!/[A-Za-z0-9]/.test(ut)) continue
      deptParts.push(t)
    }
    return deptParts.join(" ")
  }

  const cleanForDeptMatching = (s) => {
    if (!s) return ""
    return s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  }

  const findMatchingDepartment = (deptToken, depts) => {
    const tokenCleaned = cleanForDeptMatching(deptToken)
    if (!tokenCleaned) return null
    for (const d of depts) {
      if (d.code && cleanForDeptMatching(d.code) === tokenCleaned) return d
      if (d.name && cleanForDeptMatching(d.name) === tokenCleaned) return d
    }
    return null
  }

  // ── Step 2: Interactive Mapping & Edit ──────────────────────────────────────
  const handleRowChange = (rowId, field, value) => {
    setPreviewRows(prev => prev.map(row => {
      if (row.id !== rowId) return row

      const updatedRow = { ...row }

      // Populate resolved text names helper
      if (field === 'teacher_id') {
        if (value === 'create_new') {
          updatedRow.teacher_id = null
          updatedRow.create_new_teacher = true
          updatedRow.teacher_name = row.teacher_raw
        } else {
          const intVal = value ? parseInt(value, 10) : null
          updatedRow.teacher_id = intVal
          updatedRow.create_new_teacher = false
          const found = teachers.find(t => t.id === intVal)
          updatedRow.teacher_name = found ? found.name : null
        }
      } else {
        if (field === 'class_id') {
          if (value === 'create_new') {
            updatedRow.class_id = null
            updatedRow.create_new_class = true
            const parsed = extractYearSection(row.class_raw || '')
            updatedRow.class_year = parsed.year
            updatedRow.class_section = parsed.section
            updatedRow.class_name = row.class_raw || 'New Class'
            
            // Resolve department from class_raw
            const deptToken = extractDepartmentTokenFromClassText(row.class_raw || '')
            const matchedDept = findMatchingDepartment(deptToken, departments)
            if (matchedDept) {
              updatedRow.class_department_id = matchedDept.id
              updatedRow.class_department_name = matchedDept.name
            } else {
              updatedRow.class_department_id = null
              updatedRow.class_department_name = null
            }
          } else {
            const intVal = value ? parseInt(value, 10) : null
            updatedRow.class_id = intVal
            updatedRow.create_new_class = false
            updatedRow.class_year = null
            updatedRow.class_section = null
            updatedRow.class_department_id = null
            updatedRow.class_department_name = null
            const found = classes.find(c => c.id === intVal)
            updatedRow.class_name = found ? `${found.name} ${found.section}`.trim() : null
          }
          
          // When class is changed, reset subject if it doesn't match the class department/semester
          updatedRow.subject_id = null
          updatedRow.subject_name = null
          updatedRow.subject_code = null
          updatedRow.create_new_subject = false
        }
        if (field === 'subject_id') {
          if (value === 'create_new') {
            updatedRow.subject_id = null
            updatedRow.create_new_subject = true
            updatedRow.subject_name = row.subject_raw
            updatedRow.subject_code = row.subject_raw ? row.subject_raw.toUpperCase().trim() : null
          } else {
            const intVal = value ? parseInt(value, 10) : null
            updatedRow.subject_id = intVal
            updatedRow.create_new_subject = false
            const found = subjects.find(s => s.id === intVal)
            updatedRow.subject_name = found ? found.name : null
            updatedRow.subject_code = found ? found.code : null
          }
        }
        if (field === 'room_id') {
          const intVal = value ? parseInt(value, 10) : null
          updatedRow.room_id = intVal
          const found = rooms.find(r => r.id === intVal)
          updatedRow.room_number = found ? found.room_number : null
        }
      }

      // Re-evaluate mapping status
      const hasTeacher = !!updatedRow.teacher_id || updatedRow.create_new_teacher
      const hasClass = !!updatedRow.class_id || (updatedRow.create_new_class && !!updatedRow.class_department_id)

      if (hasTeacher && hasClass) {
        updatedRow.status = 'resolved'
        if (updatedRow.create_new_class) {
          if (updatedRow.create_new_subject && updatedRow.subject_raw) {
            updatedRow.message = `Matches resolved. (＋ will create class '${updatedRow.class_year} ${updatedRow.class_section}', subject '${updatedRow.subject_raw}')`
          } else {
            updatedRow.message = `Matches resolved. (＋ will create class '${updatedRow.class_year} ${updatedRow.class_section}')`
          }
        } else if (updatedRow.create_new_subject && updatedRow.subject_raw) {
          updatedRow.message = `Matches resolved. (＋ will create subject '${updatedRow.subject_raw}')`
        } else {
          updatedRow.message = 'Matches resolved.'
        }
      } else {
        updatedRow.status = 'needs_review'
        let msg = ""
        if (updatedRow.create_new_class && !updatedRow.class_department_id) {
          msg = `Class '${updatedRow.class_raw}' appears to belong to a department not yet set up in FAFLOW — create the department first, then re-import this row.`
          if (!hasTeacher) {
            msg = `Needs review: missing teacher. Also, Class '${updatedRow.class_raw}' appears to belong to a department not yet set up in FAFLOW — create the department first, then re-import this row.`
          }
        } else {
          const missing = []
          if (!hasTeacher) missing.push('teacher')
          if (!hasClass) missing.push('class')
          msg = `Needs review: missing ${missing.join(', ')}.`
          if (updatedRow.create_new_class) {
            msg += ` (＋ will create class '${updatedRow.class_year} ${updatedRow.class_section}')`
          }
        }
        if (updatedRow.create_new_subject && updatedRow.subject_raw) {
          msg += ` (＋ will create subject '${updatedRow.subject_raw}')`
        }
        updatedRow.message = msg
      }

      return updatedRow
    }))
  }

  const handleRemoveRow = (rowId) => {
    setPreviewRows(prev => prev.filter(r => r.id !== rowId))
  }

  // Filter preview rows
  const filteredRows = previewRows.filter(row => {
    const matchesStatus = filterStatus === 'all' 
      || (filterStatus === 'needs_review' && row.status === 'needs_review')
      || (filterStatus === 'resolved' && row.status === 'resolved')
      || (filterStatus === 'skipped_no_class' && row.status === 'skipped_no_class')

    const matchesSearch = !searchTerm 
      || row.teacher_raw.toLowerCase().includes(searchTerm.toLowerCase())
      || (row.teacher_name && row.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()))
      || (row.class_raw && row.class_raw.toLowerCase().includes(searchTerm.toLowerCase()))
      || (row.class_name && row.class_name.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesStatus && matchesSearch
  })

  // Calculate live counts
  const totalSlotsCount = previewRows.length
  const needsReviewCount = previewRows.filter(r => r.status === 'needs_review').length
  const skippedNoClassCount = previewRows.filter(r => r.status === 'skipped_no_class').length
  const resolvedCount = totalSlotsCount - needsReviewCount - skippedNoClassCount

  // ── Step 3: Commit Import ───────────────────────────────────────────────────
  const handleCommit = async () => {
    if (needsReviewCount > 0) {
      alert("Please resolve all 'Needs Review' items by selecting valid records, or skip them before committing.")
      return
    }
    const importableSlotsCount = previewRows.filter(r => r.status !== 'skipped_no_class').length
    if (importableSlotsCount === 0) {
      alert("No slots to import. Please upload a file first.")
      return
    }

    const hasNewClasses = previewRows.some(r => r.create_new_class)
    if (hasNewClasses && !semesterForNewClasses) {
      alert("Please select a semester for the new classes before committing.")
      return
    }

    setStatus('committing')
    setErrorMsg('')

    // Build slots format for payload, excluding skipped_no_class rows
    const slotsPayload = previewRows
      .filter(r => r.status !== 'skipped_no_class')
      .map(r => ({
        teacher_id: r.teacher_id,
        teacher_name: r.create_new_teacher ? r.teacher_raw : null,
        class_id: r.class_id,
        class_name: r.create_new_class ? r.class_name : null,
        class_section: r.create_new_class ? r.class_section : null,
        class_department_id: r.create_new_class ? r.class_department_id : null,
        create_new_class: r.create_new_class || false,
        class_year: r.create_new_class ? r.class_year : null,
        subject_id: r.subject_id,
        subject_name: r.create_new_subject ? r.subject_raw : null,
        subject_type: r.create_new_subject ? r.subject_type : null,
        room_id: r.room_id,
        day_order: r.day_order,
        period_number: r.period_number,
      }))

    try {
      const response = await timetableApi.commitImportExcel(slotsPayload, semesterForNewClasses)
      setResult(response.data)
      setStep(3)
      setStatus('done')
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Import commit failed.'
      setErrorMsg(detail)
      setStatus('preview')
    }
  }

  const handleReset = () => {
    setFile(null)
    setJsonText('')
    setJsonFile(null)
    setPreviewRows([])
    setSummary({ total_slots: 0, resolved_slots: 0, needs_review_slots: 0 })
    setStatus('idle')
    setProgress(0)
    setStep(1)
    setErrorMsg('')
    setResult(null)
    setSemesterForNewClasses(null)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>📥</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
            Automated Timetable Import Engine
          </h1>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, paddingLeft: 50 }}>
          Ingest raw Excel timetables, verify resolved mappings, correct unresolved values, and commit cleanly to the database.
        </p>
      </div>

      {/* ── Step Progress Indicator ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: '12px 24px',
        marginBottom: 24,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}>
        {[
          { num: 1, label: 'Upload Timetable' },
          { num: 2, label: 'Review & Map Mismatches' },
          { num: 3, label: 'Clean Commit' },
        ].map((s, idx) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step === s.num
                  ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                  : step > s.num ? '#22C55E' : '#E5E7EB',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: step === s.num ? 600 : 500,
                color: step === s.num ? '#111827' : '#6B7280',
              }}>{s.label}</span>
            </div>
            {idx < 2 && (
              <div style={{
                height: 1,
                flex: 1,
                background: step > s.num ? '#22C55E' : '#E5E7EB',
                margin: '0 16px',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: UPLOAD SCREEN ── */}
      {step === 1 && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            marginBottom: 20,
          }}>
            {/* Tab Toggle */}
            <div style={{
              display: 'flex',
              background: '#F3F4F6',
              borderRadius: 8,
              padding: 4,
              marginBottom: 20,
            }}>
              <button
                onClick={() => { setImportSource('excel'); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: importSource === 'excel' ? '#fff' : 'transparent',
                  color: importSource === 'excel' ? '#111827' : '#6B7280',
                  fontWeight: importSource === 'excel' ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: importSource === 'excel' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                📊 Upload Excel
              </button>
              <button
                onClick={() => { setImportSource('json'); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: importSource === 'json' ? '#fff' : 'transparent',
                  color: importSource === 'json' ? '#111827' : '#6B7280',
                  fontWeight: importSource === 'json' ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: importSource === 'json' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                🤖 AI-Assisted JSON
              </button>
            </div>

            {importSource === 'excel' ? (
              <DropZone file={file} onFile={setFile} disabled={status === 'uploading'} />
            ) : (
              <div>
                {/* AI prompt template block */}
                <div style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>1. AI Prompt Template</span>
                    <button
                      onClick={handleCopyPrompt}
                      disabled={promptLoading || !promptTemplate}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        border: '1px solid #C7D2FE',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      {promptLoading ? 'Loading...' : '📋 Copy Prompt'}
                    </button>
                  </div>
                  <pre style={{
                    fontSize: 11,
                    color: '#4B5563',
                    background: '#F3F4F6',
                    padding: 12,
                    borderRadius: 6,
                    maxHeight: 150,
                    overflowY: 'auto',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                  }}>
                    {promptError ? (
                      <span style={{ color: '#EF4444' }}>{promptError}</span>
                    ) : (
                      promptTemplate || 'Loading prompt template...'
                    )}
                  </pre>
                </div>

                {/* pasted JSON area */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    2. Paste the JSON returned by the AI:
                  </label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder='{"slots": [{"teacher_name": "...", "day_order": 1, "period_number": 1, "subject_raw": "..."}]}'
                    disabled={status === 'uploading'}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #D1D5DB',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#111827',
                      background: '#fff',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* upload JSON file alternative */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Or upload a JSON file:
                  </label>
                  <DropZone
                    file={jsonFile}
                    onFile={handleJsonFileSelect}
                    disabled={status === 'uploading'}
                    accept=".json"
                    label="JSON file (.json)"
                  />
                </div>
              </div>
            )}

            {status === 'uploading' && (
              <div style={{ marginTop: 20 }}>
                <ProgressBar value={progress} label="Parsing import data..." />
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && errorMsg && (
              <div style={{
                marginTop: 14,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#991B1B',
              }}>
                ❌ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handlePreview}
                disabled={
                  (importSource === 'excel' && !canPreview) ||
                  (importSource === 'json' && (!jsonText.strip ? !jsonText.trim() : !jsonText.trim() || status === 'uploading'))
                }
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: (
                    (importSource === 'excel' && canPreview) ||
                    (importSource === 'json' && jsonText.trim() && status !== 'uploading')
                  ) ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#E5E7EB',
                  color: (
                    (importSource === 'excel' && canPreview) ||
                    (importSource === 'json' && jsonText.trim() && status !== 'uploading')
                  ) ? '#fff' : '#9CA3AF',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: (
                    (importSource === 'excel' && canPreview) ||
                    (importSource === 'json' && jsonText.trim() && status !== 'uploading')
                  ) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {status === 'uploading' ? 'Analyzing...' : '🔍 Generate Preview & Resolve Mappings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: REVIEW & EDIT SCREEN ── */}
      {step === 2 && (
        <div>
          {/* Header Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}>
            <StatCard label="Total Slots Loaded" value={totalSlotsCount} color="#4F46E5" icon="📋" />
            <StatCard label="Resolved Slots" value={resolvedCount} color="#22C55E" icon="✅" />
            <StatCard label="Needs Review Slots" value={needsReviewCount} color="#F59E0B" icon="⚠️" />
            <StatCard label="Skipped Slots (No Class)" value={skippedNoClassCount} color="#6B7280" icon="⏭️" />
          </div>

          {/* Table Controls */}
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'all', label: 'All Loaded Rows', count: totalSlotsCount },
                { key: 'needs_review', label: 'Needs Review Only', count: needsReviewCount, color: '#D97706' },
                { key: 'resolved', label: 'Resolved Only', count: resolvedCount, color: '#16A34A' },
                { key: 'skipped_no_class', label: 'Skipped Only', count: skippedNoClassCount, color: '#6B7280' },
              ].map(f => (
                <button
                   key={f.key}
                   onClick={() => setFilterStatus(f.key)}
                   style={{
                     padding: '6px 14px',
                     borderRadius: 7,
                     border: '1px solid',
                     borderColor: filterStatus === f.key ? '#4F46E5' : '#E5E7EB',
                     background: filterStatus === f.key ? '#EEF2FF' : '#fff',
                     color: filterStatus === f.key ? '#4F46E5' : '#374151',
                     fontSize: 12,
                     fontWeight: 600,
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: 6,
                   }}
                >
                  {f.label}
                  <span style={{
                    fontSize: 10,
                    background: f.color || '#6B7280',
                    color: '#fff',
                    padding: '1px 6px',
                    borderRadius: 99,
                  }}>{f.count}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by teacher or class..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                width: 260,
                outline: 'none',
              }}
            />
          </div>

          {/* Preview list */}
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: 24,
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Slot info</th>
                  <th style={{ padding: '12px 16px' }}>Teacher Mapping</th>
                  <th style={{ padding: '12px 16px' }}>Class Mapping</th>
                  <th style={{ padding: '12px 16px' }}>Subject Mapping</th>
                  <th style={{ padding: '12px 16px' }}>Room Mapping</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    // Filter subjects by class's department and semester to keep dropdown clean
                    const selectedClass = classes.find(c => c.id === row.class_id)
                    const classSubjects = selectedClass 
                      ? subjects.filter(s => s.department_id === selectedClass.department_id && s.semester === selectedClass.semester)
                      : subjects

                    return (
                      <tr key={row.id} style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: row.status === 'needs_review' 
                          ? '#FFFBEB40' 
                          : row.status === 'skipped_no_class'
                            ? '#F3F4F680'
                            : '#fff',
                        opacity: row.status === 'skipped_no_class' ? 0.75 : 1,
                        transition: 'background 0.2s',
                      }}>
                        {/* 1. Slot Coordinate Info */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B7280' }}>{row.source_cell}</div>
                          <div style={{ fontWeight: 600, color: '#111827', marginTop: 3 }}>Day Order {row.day_order}</div>
                          <div style={{ fontSize: 11, color: '#4F46E5', fontWeight: 500 }}>Period {row.period_number}</div>
                        </td>

                        {/* 2. Teacher Map */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Raw: "{row.teacher_raw}"</div>
                          <select
                            value={row.teacher_id === null && row.create_new_teacher ? 'create_new' : (row.teacher_id || '')}
                            disabled={row.status === 'skipped_no_class'}
                            onChange={e => handleRowChange(row.id, 'teacher_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: `1px solid ${!row.teacher_id && !row.create_new_teacher ? '#D97706' : '#D1D5DB'}`,
                              fontSize: 12,
                              background: !row.teacher_id && !row.create_new_teacher ? '#FFFBEB' : '#fff',
                              color: '#374151',
                            }}
                          >
                            <option value="">-- Select Teacher --</option>
                            <option value="create_new">＋ Create new teacher: "{row.teacher_raw}"</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.department || 'No Dept'})</option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Class Map */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Raw: "{row.class_raw || 'None'}"</div>
                          <select
                            value={row.class_id === null && row.create_new_class ? 'create_new' : (row.class_id || '')}
                            disabled={row.status === 'skipped_no_class'}
                            onChange={e => handleRowChange(row.id, 'class_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: `1px solid ${!row.class_id && !row.create_new_class ? '#D97706' : '#D1D5DB'}`,
                              fontSize: 12,
                              background: !row.class_id && !row.create_new_class ? '#FFFBEB' : '#fff',
                              color: '#374151',
                            }}
                          >
                            <option value="">-- Select Class --</option>
                            {row.class_raw && (
                              <option value="create_new">＋ Create new class: "{row.class_raw}"</option>
                            )}
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name} {c.section} (S{c.semester})</option>
                            ))}
                          </select>
                          {row.create_new_class && (
                            <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600, marginTop: 4 }}>
                              🆕 Will create: {row.class_year || 'Year?'} {row.class_section || 'Section?'} ({departments.find(d => d.id === row.class_department_id)?.code || 'No Dept'})
                            </div>
                          )}
                        </td>

                        {/* 4. Subject Map */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Raw: "{row.subject_raw || 'None'}"</div>
                          <select
                            value={row.subject_id === null && row.create_new_subject ? 'create_new' : (row.subject_id || '')}
                            disabled={row.status === 'skipped_no_class' || (!row.class_id && !row.create_new_class)}
                            onChange={e => handleRowChange(row.id, 'subject_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #D1D5DB',
                              fontSize: 12,
                              background: row.status === 'skipped_no_class' || (!row.class_id && !row.create_new_class) ? '#F3F4F6' : '#fff',
                              color: '#374151',
                            }}
                          >
                            {row.status === 'skipped_no_class' ? (
                              <option value="">-- Skipped (No Class) --</option>
                            ) : !row.class_id && !row.create_new_class ? (
                              <option value="">-- Select Class First --</option>
                            ) : (
                              <>
                                <option value="">-- Optional Subject --</option>
                                {row.subject_raw && (
                                  <option value="create_new">＋ Create subject: "{row.subject_raw}"</option>
                                )}
                                {classSubjects.map(s => (
                                  <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                ))}
                              </>
                            )}
                          </select>
                          {row.create_new_subject && (
                            <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600, marginTop: 4 }}>
                              🆕 Will create: {row.subject_raw} (Credits set to 1 (placeholder) — update in Subjects admin page)
                            </div>
                          )}
                        </td>

                        {/* 5. Room Map */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Raw: "{row.room_raw || 'None'}"</div>
                          <select
                            value={row.room_id || ''}
                            disabled={row.status === 'skipped_no_class'}
                            onChange={e => handleRowChange(row.id, 'room_id', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #D1D5DB',
                              fontSize: 12,
                              background: row.status === 'skipped_no_class' ? '#F3F4F6' : '#fff',
                              color: '#374151',
                            }}
                          >
                            <option value="">-- Optional Room --</option>
                            {rooms.map(r => (
                              <option key={r.id} value={r.id}>{r.room_number} ({r.room_type})</option>
                            ))}
                          </select>
                        </td>

                        {/* 6. Row Resolution Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'inline-block',
                            background: row.status === 'resolved' ? '#DCFCE7' : row.status === 'skipped_no_class' ? '#E5E7EB' : '#FEF3C7',
                            color: row.status === 'resolved' ? '#166534' : row.status === 'skipped_no_class' ? '#4B5563' : '#92400E',
                            marginBottom: 4,
                          }}>
                            {row.status === 'resolved' ? '✓ Resolved' : row.status === 'skipped_no_class' ? '⏭️ Skipped' : '⚠ Review'}
                          </span>
                          <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.2 }}>{row.message}</div>
                        </td>

                        {/* 7. Action Skip Button */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#EF4444',
                              cursor: 'pointer',
                              fontSize: 16,
                              padding: '4px',
                            }}
                            title="Skip this cell from import"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Commit Error Message (e.g. 409 database conflicts) */}
          {errorMsg && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 13,
              color: '#991B1B',
              marginBottom: 20,
            }}>
              <strong>Import Reverted (Transaction Rolled Back):</strong>
              <div style={{ marginTop: 6, fontFamily: 'monospace' }}>{errorMsg}</div>
            </div>
          )}

          {/* Committing Loading Spinner */}
          {status === 'committing' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '16px 20px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: '#4F46E5',
              marginBottom: 20,
            }}>
              <span style={{
                width: 16, height: 16, border: '2px solid rgba(79,70,229,0.3)',
                borderTopColor: '#4F46E5', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'inline-block',
              }} />
              Committing timetable slots to database...
            </div>
          )}

          {/* Semester selection for new classes */}
          {previewRows.some(r => r.create_new_class) && (
            <div style={{
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div>
                <strong style={{ fontSize: 13, color: '#374151' }}>Semester for New Classes:</strong>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  Some slots are marked to auto-create new classes. Please specify the target semester (1-8).
                </div>
              </div>
              <select
                value={semesterForNewClasses || ''}
                onChange={e => setSemesterForNewClasses(e.target.value ? parseInt(e.target.value, 10) : null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  background: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Semester --</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          )}

          {/* Review Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button
              onClick={handleReset}
              disabled={status === 'committing'}
              style={{
                padding: '11px 20px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: '#fff',
                color: '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Cancel & Re-upload
            </button>

            <button
              onClick={handleCommit}
              disabled={
                needsReviewCount > 0 || 
                totalSlotsCount === 0 || 
                status === 'committing' || 
                (previewRows.some(r => r.create_new_class) && !semesterForNewClasses)
              }
              style={{
                padding: '11px 24px',
                borderRadius: 8,
                border: 'none',
                background: (needsReviewCount > 0 || totalSlotsCount === 0 || status === 'committing' || (previewRows.some(r => r.create_new_class) && !semesterForNewClasses))
                  ? '#E5E7EB'
                  : 'linear-gradient(135deg, #22C55E, #16A34A)',
                color: (needsReviewCount > 0 || totalSlotsCount === 0 || status === 'committing' || (previewRows.some(r => r.create_new_class) && !semesterForNewClasses)) ? '#9CA3AF' : '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: (needsReviewCount > 0 || totalSlotsCount === 0 || status === 'committing' || (previewRows.some(r => r.create_new_class) && !semesterForNewClasses)) ? 'not-allowed' : 'pointer',
                boxShadow: (needsReviewCount > 0 || totalSlotsCount === 0 || status === 'committing' || (previewRows.some(r => r.create_new_class) && !semesterForNewClasses)) ? 'none' : '0 2px 4px rgba(34,197,94,0.2)',
                transition: 'all 0.2s',
              }}
            >
              🚀 Confirm & Commit ({totalSlotsCount} Slots)
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCCESS SCREEN ── */}
      {step === 3 && result && (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            borderRadius: 14,
            padding: '24px 32px',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
            marginBottom: 24,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Timetable Successfully Imported!</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 8, marginBottom: 0 }}>
              All slots have passed the database unique conflict validations and were written atomically in a single transaction.
            </p>
          </div>

          {/* Commit Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 24,
          }}>
            <StatCard label="Teachers Processed" value={result.teachers_processed} color="#4F46E5" icon="👨‍🏫" />
            <StatCard label="Slots Inserted" value={result.slots_inserted} color="#10B981" icon="✅" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                background: '#fff',
                color: '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Import Another File
            </button>
            
            <a
              href="/admin/timetable"
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(79,70,229,0.2)',
              }}
            >
              📅 View Timetable Dashboard
            </a>
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
