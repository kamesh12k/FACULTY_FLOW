import { useState } from 'react'
import { exportToCSV } from './utils'
import { generateCreditPdfReport } from './pdfReportGenerator'
import { useAuth } from '../../../context/AuthContext'

function ExportButton({ icon, label, desc, onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all hover:border-slate-300 text-left min-w-[200px] flex-1 shadow-2xs cursor-pointer disabled:opacity-60"
    >
      <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 border border-primary-100">
        {loading ? (
          <svg className="w-4 h-4 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          icon
        )}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

export default function ExportBar({ report, transactions, allTeachers = [] }) {
  const { user } = useAuth()
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [feedback, setFeedback] = useState(null)

  function handleExportBalanceExcel() {
    const headers = ['Teacher Name', 'Department', 'Current Balance', 'Health Status']
    const rows = [...report]
      .sort((a, b) => b.balance - a.balance)
      .map(r => {
        let status = 'Neutral'
        if (r.balance >= 10) status = 'Excellent'
        else if (r.balance >= 5) status = 'Good'
        else if (r.balance >= 1) status = 'Average'
        else if (r.balance >= -3) status = 'Needs Attention'
        else if (r.balance < -3) status = 'Critical'
        return [r.name, r.department || '', r.balance, status]
      })
    exportToCSV(`faculty-credits-balance-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  function handleExportAuditLedgerCSV() {
    const headers = ['Record ID', 'Timestamp', 'Faculty Name', 'Event Category', 'Credit Change', 'Reason / Context', 'Related Leave ID']
    const teacherMap = {}
    for (const r of report) teacherMap[r.teacher_id] = r.name

    const rows = [...transactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(tx => [
        `TX-${tx.id}`,
        new Date(tx.created_at).toLocaleString('en-IN'),
        teacherMap[tx.teacher_id] || `Teacher #${tx.teacher_id}`,
        tx.category || 'general',
        tx.change >= 0 ? `+${tx.change}` : tx.change,
        tx.reason || '',
        tx.related_leave_id ? `#${tx.related_leave_id}` : 'N/A'
      ])

    exportToCSV(`institutional-credit-audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    setFeedback(null)
    try {
      const res = await generateCreditPdfReport({
        report,
        transactions,
        allTeachers,
        filterScope: {},
        currentUser: user || {},
      })

      if (!res.success && res.reason === 'NO_DATA') {
        setFeedback({
          type: 'error',
          message: 'No credit data available. There are no credit records matching the current report.',
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Official credit PDF report "${res.fileName}" generated successfully.`,
        })
      }
    } catch (err) {
      console.error('PDF generation error:', err)
      setFeedback({
        type: 'error',
        message: 'Failed to generate PDF report. Please try again.',
      })
    } finally {
      setGeneratingPdf(false)
      setTimeout(() => setFeedback(null), 6000)
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          Accounting Reports & Exports
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate official institutional credit ledgers, transaction audit logs, and publication-grade PDF statements.
        </p>
      </div>

      {feedback && (
        <div className={`mb-4 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <ExportButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Generate Official PDF"
          desc="Print-ready institution report"
          onClick={handleGeneratePdf}
          loading={generatingPdf}
        />
        <ExportButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Audit Ledger CSV"
          desc="Full transaction history log"
          onClick={handleExportAuditLedgerCSV}
        />
        <ExportButton
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
          label="Faculty Balances CSV"
          desc="Current balance snapshot"
          onClick={handleExportBalanceExcel}
        />
      </div>
    </div>
  )
}
