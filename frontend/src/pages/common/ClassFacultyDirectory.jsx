import { useEffect, useState } from 'react'
import { classesApi } from '../../api/services'
import { Spinner, EmptyState } from '../../components/ui'

export default function ClassFacultyDirectory() {
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { classesApi.directory().then(r => setClasses(r.data)).finally(() => setLoading(false)) }, [])
  const selectClass = async (cls) => {
    setSelected(cls); setDetail(null)
    const { data } = await classesApi.faculty(cls.id)
    setDetail(data)
  }
  const visible = classes.filter(c => `${c.name} ${c.section}`.toLowerCase().includes(query.toLowerCase()))
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  return <div className="space-y-6">
    <div><h1 className="text-xl font-bold text-gray-900">Class Faculty Directory</h1><p className="text-sm text-gray-500 mt-1">Select a global class to see every teacher handling it.</p></div>
    <input className="input max-w-md" placeholder="Search class or section…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="card divide-y max-h-[560px] overflow-y-auto">
        {visible.length ? visible.map(c => <button key={c.id} onClick={() => selectClass(c)} className={`w-full text-left p-4 hover:bg-gray-50 ${selected?.id === c.id ? 'bg-primary-50' : ''}`}><p className="font-semibold text-gray-800">{c.name} – {c.section}</p><p className="text-xs text-gray-500 mt-1">Semester {c.semester} · {c.faculty_count} faculty · {c.subject_count} subjects</p></button>) : <EmptyState message="No classes found." />}
      </div>
      <div className="card overflow-hidden">
        {!selected ? <EmptyState message="Choose a class to view its faculty." /> : !detail ? <div className="p-10 flex justify-center"><Spinner /></div> : <>
          <div className="p-5 border-b"><h2 className="font-bold text-gray-900">{detail.name} – {detail.section}</h2><p className="text-sm text-gray-500">Semester {detail.semester}</p></div>
          {detail.faculty.length === 0 ? <EmptyState message="No approved timetable entries for this class." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Teacher', 'Department', 'Subject', 'Schedule', 'Room'].map(h => <th className="p-3 text-left text-xs text-gray-500 uppercase" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{detail.faculty.map((f, i) => <tr key={`${f.teacher_id}-${i}`}><td className="p-3 font-medium">{f.teacher_name}</td><td className="p-3 text-gray-600">{f.teacher_department || '—'}</td><td className="p-3">{f.subject_name || '—'}</td><td className="p-3">DO{f.day_order} · P{f.period_number}</td><td className="p-3">{f.room || '—'}</td></tr>)}</tbody></table></div>}
        </>}
      </div>
    </div>
  </div>
}
