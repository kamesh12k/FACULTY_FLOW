import { useEffect, useState, useCallback } from 'react'
import { creditsApi, teachersApi, adminApi } from '../../../api/services'
import { Spinner, Modal, ErrorAlert } from '../../../components/ui'

import KPICards from './KPICards'
import Leaderboard from './Leaderboard'
import AttentionPanel from './AttentionPanel'
import BalanceTable from './BalanceTable'
import ActivityTimeline from './ActivityTimeline'
import CreditHistoryDrawer from './CreditHistoryDrawer'
import ExportBar from './ExportBar'

const CATEGORY_OPTIONS = [
  { value: 'substitute_class',  label: 'Substitute Class' },
  { value: 'exam_duty',         label: 'Exam Duty' },
  { value: 'department_duty',   label: 'Department Duty' },
  { value: 'workshop',          label: 'Workshop' },
  { value: 'event_coordination',label: 'Event Coordination' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
  { value: 'penalty',           label: 'Penalty / Deduction' },
  { value: 'correction',        label: 'Correction / Undo' },
  { value: 'other',             label: 'Other' },
]

function RefreshIcon({ className = 'w-4 h-4', spinning }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`${className} ${spinning ? 'animate-spin' : ''}`}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
    </svg>
  )
}

export default function AdminCredits() {
  const [report, setReport] = useState([])
  const [transactions, setTransactions] = useState([])
  const [allTeachers, setAllTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Modal state (manual adjustment)
  const [modalOpen, setModalOpen] = useState(false)
  const [prefillTeacher, setPrefillTeacher] = useState(null)
  const [form, setForm] = useState({ teacher_id: '', change: '', reason: '', category: 'manual_adjustment' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Drawer state (credit history)
  const [drawerTeacher, setDrawerTeacher] = useState(null)

  const loadData = useCallback((silent = false) => {
    if (silent) setRefreshing(true)
    return Promise.all([
      creditsApi.report(),
      creditsApi.allTransactions(),
      teachersApi.list(),
    ])
      .then(([r, t, teachers]) => {
        setReport(r.data)
        setTransactions(t.data)
        setAllTeachers(teachers.data || [])
        setLastUpdated(new Date())
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openAdjustModal = (teacher = null) => {
    setPrefillTeacher(teacher)
    // teacher may come from report (has teacher_id) or from allTeachers list (has id)
    const tid = teacher ? (teacher.teacher_id ?? teacher.id ?? '') : ''
    setForm({
      teacher_id: String(tid),
      change: '',
      reason: '',
      category: 'manual_adjustment',
    })
    setError('')
    setModalOpen(true)
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await creditsApi.adjust({
        teacher_id: Number(form.teacher_id),
        change: Number(form.change),
        reason: form.reason,
        category: form.category,
      })
      setModalOpen(false)
      setForm({ teacher_id: '', change: '', reason: '', category: 'manual_adjustment' })
      setPrefillTeacher(null)
      loadData(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to adjust credits.')
    } finally {
      setSaving(false)
    }
  }

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to permanently clear all credit transactions and reset all teacher credit balances? This action cannot be undone.")) {
      return
    }
    setRefreshing(true)
    try {
      await adminApi.clearCreditsHistory()
      loadData(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to clear credits history.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleOpenHistory = (teacher) => {
    setDrawerTeacher(teacher)
  }

  const handleAttentionReview = (teacher) => {
    setDrawerTeacher(teacher)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400">Loading Credit Intelligence Dashboard…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Credits Intelligence Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Faculty credit management &middot; {report.length} teachers &middot; {transactions.length} transactions total
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-[11px] text-gray-400 hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleClearHistory}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 text-xs font-semibold border border-red-200 transition disabled:opacity-40"
          >
            Clear History
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded transition-colors"
          >
            <RefreshIcon className="w-3.5 h-3.5" spinning={refreshing} />
            Refresh
          </button>
          <button
            onClick={() => openAdjustModal()}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 rounded shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Adjust Credits
          </button>
        </div>
      </div>

      {/* ── Feature 1: KPI Cards ── */}
      <KPICards report={report} transactions={transactions} />

      {/* ── Features 2 & 3: Leaderboard + Attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Leaderboard report={report} />
        <AttentionPanel
          report={report}
          transactions={transactions}
          onReview={handleAttentionReview}
        />

      </div>

      {/* ── Feature 4: Modern Balance Table ── */}
      <BalanceTable
        report={report}
        transactions={transactions}
        onViewHistory={handleOpenHistory}
        onAdjust={openAdjustModal}
      />

      {/* ── Feature 5: Activity Timeline ── */}
      <ActivityTimeline transactions={transactions} report={report} />

      {/* ── Feature 7: Export Bar ── */}
      <ExportBar report={report} transactions={transactions} />

      {/* ── Feature 6: Credit History Drawer ── */}
      {drawerTeacher && (
        <CreditHistoryDrawer
          teacher={drawerTeacher}
          transactions={transactions}
          onClose={() => setDrawerTeacher(null)}
          onAdjust={(t) => { setDrawerTeacher(null); openAdjustModal(t) }}
        />
      )}

      {/* ── Manual Adjustment Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Manual Credit Adjustment">
        <form onSubmit={handleAdjust} className="space-y-4">
          <ErrorAlert message={error} />

          {/* Teacher select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Select Teacher</label>
            <select
              required
              className="input w-full"
              value={form.teacher_id}
              onChange={e => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Choose teacher…</option>
              {[...allTeachers]
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(t => {
                  const creditEntry = report.find(r => r.teacher_id === t.id)
                  const balance = creditEntry ? creditEntry.balance : null
                  const balanceStr = balance !== null
                    ? ` — Balance: ${balance >= 0 ? '+' : ''}${balance}`
                    : ' — No credits yet'
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department || 'Faculty'}){balanceStr}
                    </option>
                  )
                })}
            </select>
          </div>

          {/* Credit category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Credit Category</label>
            <select
              required
              className="input w-full"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Adjustment value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Adjustment Value</label>
            <input
              type="number"
              required
              placeholder="e.g. 1 to add, -1 to deduct"
              className="input w-full"
              value={form.change}
              onChange={e => setForm({ ...form, change: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Enter a positive integer to credit, or negative to deduct.</p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Adjustment</label>
            <textarea
              required
              placeholder="e.g., Exam duty cover — Semester examination invigilation"
              className="input w-full h-20 py-2 resize-none"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? 'Saving…' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
