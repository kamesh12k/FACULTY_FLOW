import { exportToCSV } from './utils'

function ExportButton({ icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all duration-150 hover:border-slate-300 text-left min-w-[200px] shadow-2xs hover:shadow-xs active:scale-95"
    >
      <div className="text-indigo-600 shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-900">{label}</div>
        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

export default function ExportBar({ report, transactions }) {

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

  function handlePrintReport() {
    const printWindow = window.open('', '_blank')
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    let rowsHtml = ''
    const sorted = [...report].sort((a, b) => b.balance - a.balance)
    sorted.forEach((r, idx) => {
      let status = 'Neutral'
      let statusColor = '#6b7280'
      if (r.balance >= 10) { status = 'Excellent'; statusColor = '#059669' }
      else if (r.balance >= 5) { status = 'Good'; statusColor = '#10b981' }
      else if (r.balance >= 1) { status = 'Average'; statusColor = '#3b82f6' }
      else if (r.balance >= -3) { status = 'Needs Attention'; statusColor = '#f59e0b' }
      else if (r.balance < -3) { status = 'Critical'; statusColor = '#dc2626' }

      rowsHtml += `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 10px 12px; font-family: monospace; color: #6b7280;">#${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${r.name}</td>
          <td style="padding: 10px 12px; color: #4b5563;">${r.department || 'Faculty'}</td>
          <td style="padding: 10px 12px; font-family: monospace; font-weight: 700; color: ${r.balance >= 0 ? '#059669' : '#dc2626'};">${r.balance >= 0 ? '+' : ''}${r.balance}</td>
          <td style="padding: 10px 12px;"><span style="font-size: 11px; font-weight: 700; color: ${statusColor};">${status}</span></td>
        </tr>
      `
    })

    printWindow.document.write(`
      <html>
        <head>
          <title>Institutional Faculty Credit Accounting Audit - ${dateStr}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            h1 { color: #111827; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
            .subtitle { color: #6b7280; font-size: 12px; margin-top: 0; margin-bottom: 24px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { text-align: left; padding: 10px 12px; background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; }
            .summary { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; gap: 40px; margin-bottom: 24px; font-size: 12px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-label { color: #64748b; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-val { color: #0f172a; font-weight: 800; font-size: 18px; margin-top: 2px; }
          </style>
        </head>
        <body>
          <h1>Institutional Faculty Credit Accounting Audit</h1>
          <div class="subtitle">Generated on ${dateStr}</div>
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total Faculty</span>
              <span class="summary-val">${report.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Negative Balances</span>
              <span class="summary-val">${report.filter(r => r.balance < 0).length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Audited Records</span>
              <span class="summary-val">${transactions.length}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Rank</th>
                <th>Teacher</th>
                <th>Department</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl">
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <span>📊</span> Accounting Reports & Audit Exports
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Generate official institutional credit ledgers, transaction audit logs, and printable accounting statements
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Audit Ledger CSV"
          desc="Full transaction history log"
          onClick={handleExportAuditLedgerCSV}
        />
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Faculty Balances CSV"
          desc="Current balance snapshot"
          onClick={handleExportBalanceExcel}
        />
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17v2m0 0v2m0-2h2m-2 0H9" />
            </svg>
          }
          label="Print Audit Ledger"
          desc="Print-ready admin summary"
          onClick={handlePrintReport}
        />
      </div>
    </div>
  )
}
