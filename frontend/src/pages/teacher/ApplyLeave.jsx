import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { leavesApi, academicCalendarApi } from '../../api/services'
import { ErrorAlert, Spinner, DayTypeBadge } from '../../components/ui'
import { CheckCircleIcon } from '../../components/icons'

function pad(n) { return String(n).padStart(2, '0') }
function isoFor(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const REASON_CHIPS = ['Medical leave', 'Personal reason', 'Conference attendance', 'Family event']

export default function ApplyLeave() {
  const [form, setForm] = useState({ date: isoFor(1), mode: 'whole_day', period_number: '1', period_numbers: [], reason: '' })
  const [calendarInfo, setCalendarInfo] = useState(null)
  const [checkingDate, setCheckingDate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!form.date) { setCalendarInfo(null); return }
    setCheckingDate(true)
    academicCalendarApi.resolve(form.date)
      .then(r => setCalendarInfo(r.data))
      .catch(() => setCalendarInfo(null))
      .finally(() => setCheckingDate(false))
  }, [form.date])

  const isBlocked = calendarInfo?.blocks_operations

  const togglePeriod = (p) => {
    setForm(f => ({
      ...f,
      period_numbers: f.period_numbers.includes(p) ? f.period_numbers.filter(x => x !== p) : [...f.period_numbers, p].sort(),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (isBlocked) {
      setError(`${form.date} is marked as ${calendarInfo.day_type.replace('_', ' ')} — leave cannot be applied for this date.`)
      return
    }
    setLoading(true)
    try {
      if (form.mode === 'single') {
        await leavesApi.apply({ date: form.date, period_number: Number(form.period_number), reason: form.reason })
      } else if (form.mode === 'whole_day') {
        await leavesApi.applyBatch({ date: form.date, whole_day: true, reason: form.reason })
      } else {
        if (form.period_numbers.length === 0) {
          setError('Select at least one period.')
          setLoading(false)
          return
        }
        await leavesApi.applyBatch({ date: form.date, period_numbers: form.period_numbers, reason: form.reason })
      }
      setSuccess(true)
      setTimeout(() => navigate('/teacher/leaves'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit leave request.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-12 text-center space-y-4 border border-emerald-100">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-gray-900">Leave request submitted</p>
              <p className="text-sm text-gray-600">Your request has been recorded. Redirecting to your leave history…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const dateShortcuts = [
    { label: 'Tomorrow', value: isoFor(1) },
    { label: 'In 2 days', value: isoFor(2) },
    { label: 'Next week', value: isoFor(7) },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Request leave</h1>
          <p className="text-base text-gray-600 mt-2">Quick and simple. We'll keep track of everything.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Error Alert */}
            {error && <ErrorAlert message={error} />}

            {/* Date Selection Section */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">1</span>
                <label className="block text-lg font-semibold text-gray-900">Pick your date</label>
              </div>

              {/* Quick shortcuts */}
              <div className="pl-11 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {dateShortcuts.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, date: s.value })}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${form.date === s.value
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                          : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Date picker */}
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  value={form.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />

                {/* Calendar status */}
                {checkingDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Spinner size="xs" />
                    <span>Checking calendar…</span>
                  </div>
                )}

                {calendarInfo && !checkingDate && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    {calendarInfo.day_type === 'working' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">Day Order {calendarInfo.day_order}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <DayTypeBadge dayType={calendarInfo.day_type} small />
                      </div>
                    )}
                    {isBlocked && <span className="text-xs text-red-600 font-medium ml-auto">Can't apply for this date</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Time Selection Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-baseline gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">2</span>
                <label className="block text-lg font-semibold text-gray-900">How long do you need?</label>
              </div>

              <div className="pl-11">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'whole_day', label: 'Whole day', icon: '📅' },
                    { value: 'single', label: 'One period', icon: '⏰' },
                    { value: 'custom', label: 'Periods', icon: '⚙️' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, mode: opt.value })}
                      className={`p-3 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${form.mode === opt.value
                          ? 'bg-teal-50 border-teal-500 text-teal-700'
                          : 'bg-white border-slate-200 text-gray-700 hover:border-slate-300'
                        }`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Period Selection - Single */}
            {form.mode === 'single' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-semibold text-gray-900">Select period</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  value={form.period_number}
                  onChange={e => setForm({ ...form, period_number: e.target.value })}
                >
                  {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>Period {p}</option>)}
                </select>
              </div>
            )}

            {/* Period Selection - Custom */}
            {form.mode === 'custom' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <label className="block text-sm font-semibold text-gray-900">Select periods you need off</label>
                <div className="flex gap-3 justify-center py-2">
                  {[1, 2, 3, 4, 5].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePeriod(p)}
                      className={`w-12 h-12 rounded-lg border-2 font-bold text-sm transition-all duration-200 ${form.period_numbers.includes(p)
                          ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200'
                          : 'bg-white border-slate-300 text-gray-700 hover:border-teal-300'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-baseline gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">3</span>
                <label className="block text-lg font-semibold text-gray-900">Tell us why</label>
              </div>

              <div className="pl-11 space-y-3">
                {/* Quick reason chips */}
                <div className="flex gap-2 flex-wrap">
                  {REASON_CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setForm({ ...form, reason: chip })}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${form.reason === chip
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                          : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Reason textarea */}
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all"
                  placeholder="Or describe your reason in detail…"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading || isBlocked}
                className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-teal-200 hover:shadow-lg hover:shadow-teal-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <span>Submit leave request</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer help text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Your leave request will be sent to your administrator for approval.
        </p>
      </div>
    </div>
  )
}