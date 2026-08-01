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
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'balances' | 'activity'

  // Single adjustment modal state
  const [modalOpen, setModalOpen] = useState(false)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-sm font-semibold text-slate-500">Loading Credit Intelligence System…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto pb-10">

      {/* ── Enterprise Hero Header ── */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider border border-indigo-500/30">
                Institutional Financial Controls
              </span>
              {lastUpdated && (
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2.5 flex items-center gap-3 text-white">
              <span>💳</span> Credits Intelligence & Audit System
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
              Real-time faculty credit accounting, automated substitution balancing, and risk reconciliation radar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/10 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshIcon className="w-3.5 h-3.5" spinning={refreshing} />
              Sync Data
            </button>
            <button
              onClick={() => openAdjustModal()}
              className="btn-primary text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>+</span> Adjust Credits
            </button>
            <button
              onClick={handleClearHistory}
              disabled={refreshing}
              className="px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 rounded-xl border border-rose-800/40 transition disabled:opacity-40"
              title="Reset credit history"
            >
              Reset History
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto">
          {[
            ['overview', '📊 Executive Overview'],
            ['balances', '💳 Faculty Balance Matrix'],
            ['activity', '📜 Transaction Audit Stream'],
          ].map(([tabKey, tabLabel]) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tabKey
                  ? 'bg-white text-slate-900 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Executive Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          <KPICards report={report} transactions={transactions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Leaderboard report={report} />
            <AttentionPanel
              report={report}
              transactions={transactions}
              onReview={(t) => setDrawerTeacher(t)}
            />
          </div>

          <BalanceTable
            report={report}
            transactions={transactions}
            onViewHistory={(t) => setDrawerTeacher(t)}
            onAdjust={openAdjustModal}
          />
        </div>
      )}

      {/* ── Tab 2: Faculty Balance Matrix ── */}
      {activeTab === 'balances' && (
        <div className="space-y-6 animate-fadeIn">
          <BalanceTable
            report={report}
            transactions={transactions}
            onViewHistory={(t) => setDrawerTeacher(t)}
            onAdjust={openAdjustModal}
          />
        </div>
      )}

      {/* ── Tab 3: Transaction Audit Stream ── */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-fadeIn">
          <ActivityTimeline transactions={transactions} report={report} />
          <ExportBar report={report} transactions={transactions} />
        </div>
      )}

      {/* ── Credit History Drawer ── */}
      {drawerTeacher && (
        <CreditHistoryDrawer
          teacher={drawerTeacher}
          transactions={transactions}
          onClose={() => setDrawerTeacher(null)}
          onAdjust={(t) => { setDrawerTeacher(null); openAdjustModal(t) }}
        />
      )}

      {/* ── Single Adjustment Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Manual Credit Adjustment">
        <form onSubmit={handleAdjust} className="space-y-4">
          <ErrorAlert message={error} />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Faculty Member</label>
            <select
              required
              className="input w-full"
              value={form.teacher_id}
              onChange={e => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Select teacher…</option>
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Credit Category</label>
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Adjustment Value</label>
            <input
              type="number"
              required
              placeholder="e.g. 1 to add, -1 to deduct"
              className="input w-full"
              value={form.change}
              onChange={e => setForm({ ...form, change: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1 font-medium">Positive integer to award credits, negative integer to deduct.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Adjustment</label>
            <textarea
              required
              placeholder="e.g. Exam invigilation duty cover..."
              className="input w-full h-20 py-2 resize-none"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Applying…' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
