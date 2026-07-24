import { exportToCSV } from './utils'

function ExportButton({ icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all duration-100 hover:border-gray-300 text-left min-w-[180px] shadow-sm"
    >
      <div className="text-gray-400">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-800">{label}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

export default function ExportBar({ report, transactions }) {

  function handleExportBalanceExcel() {
    const headers = ['Teacher', 'Department', 'Balance', 'Status']
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
    exportToCSV(`faculty-credits-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
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
          <td style="padding: 10px 12px; font-weight: 500; color: #111827;">${r.name}</td>
          <td style="padding: 10px 12px; color: #4b5563;">${r.department || 'Faculty'}</td>
          <td style="padding: 10px 12px; font-family: monospace; font-weight: 600; color: ${r.balance >= 0 ? '#059669' : '#dc2626'};">${r.balance >= 0 ? '+' : ''}${r.balance}</td>
          <td style="padding: 10px 12px;"><span style="font-size: 11px; font-weight: 600; color: ${statusColor};">${status}</span></td>
        </tr>
      `
    })

    printWindow.document.write(`
      <html>
        <head>
          <title>Faculty Credit Report - ${dateStr}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            h1 { color: #111827; font-size: 22px; font-weight: 700; margin-bottom: 4px; }
            .subtitle { color: #6b7280; font-size: 12px; margin-top: 0; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { text-align: left; padding: 10px 12px; background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; color: #475569; font-weight: 600; }
            .summary { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; gap: 40px; margin-bottom: 24px; font-size: 12px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-label { color: #64748b; font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-val { color: #0f172a; font-weight: 700; font-size: 18px; margin-top: 2px; }
          </style>
        </head>
        <body>
          <h1>Faculty Credit Directory Report</h1>
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
              <span class="summary-label">Audit Logs</span>
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

  async function handleExportPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      const now = new Date()
      const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(17, 24, 39)
      doc.text('Faculty Credit System Report', 20, 25)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(107, 114, 128)
      doc.text(`Generated on ${dateStr}`, 20, 32)

      doc.setFillColor(248, 250, 252)
      doc.rect(15, 38, 180, 24, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.rect(15, 38, 180, 24)

      const kpis = [
        ['Faculty count', report.length],
        ['Negative balance', report.filter(r => r.balance < 0).length],
        ['Transactions', transactions.length]
      ]
      
      doc.setFontSize(8)
      kpis.forEach(([label, val], i) => {
        const x = 25 + i * 60
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        doc.text(String(val), x, 46)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text(label, x, 52)
      })

      // Table headers
      const cols = [15, 70, 130, 165]
      const headers = ['Teacher', 'Department', 'Balance', 'Status']
      doc.setFillColor(243, 244, 246)
      doc.rect(15, 70, 180, 7, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(55, 65, 81)
      headers.forEach((h, i) => doc.text(h, cols[i], 75))

      const sorted = [...report].sort((a, b) => b.balance - a.balance).slice(0, 35)
      sorted.forEach((r, i) => {
        const y = 84 + i * 5.5
        if (i % 2 === 0) {
          doc.setFillColor(249, 250, 251)
          doc.rect(15, y - 4, 180, 5.5, 'F')
        }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(17, 24, 39)
        doc.text(r.name.slice(0, 28), cols[0], y)
        doc.text((r.department || '—').slice(0, 22), cols[1], y)
        doc.setTextColor(r.balance >= 0 ? 5 : 220, r.balance >= 0 ? 150 : 38, r.balance >= 0 ? 105 : 38)
        doc.text((r.balance >= 0 ? '+' : '') + r.balance, cols[2], y)
        doc.setTextColor(17, 24, 39)
        
        let status = 'Neutral'
        if (r.balance >= 10) status = 'Excellent'
        else if (r.balance >= 5) status = 'Good'
        else if (r.balance >= 1) status = 'Average'
        else if (r.balance >= -3) status = 'Attention'
        else if (r.balance < -3) status = 'Critical'
        doc.text(status, cols[3], y)
      })

      doc.save(`faculty-credits-report-${now.toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed.')
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Reporting & Exports
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Download directory or generate print-ready administration summaries</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Export Excel"
          desc="Download CSV directory"
          onClick={handleExportBalanceExcel}
        />
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          label="Export PDF"
          doc="Formatted PDF document"
          onClick={handleExportPDF}
        />
        <ExportButton
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17v2m0 0v2m0-2h2m-2 0H9" />
            </svg>
          }
          label="Print Report"
          desc="Open system print dialog"
          onClick={handlePrintReport}
        />
      </div>
    </div>
  )
}

