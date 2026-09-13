import { useState, useEffect } from 'react'
import { CloseIcon, SearchIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/icons'
import { Spinner } from '../../components/ui'
import { announcementApi } from '../../api/announcements'
import { useToast } from '../../components/ui/Toast'

export default function AnnouncementAnalyticsModal({ announcementId, onClose }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, viewed, unread, ack, pending

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const res = await announcementApi.getAnnouncementAnalytics(announcementId)
        setData(res.data)
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to load analytics', 'error')
        onClose()
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [announcementId])

  const exportCSV = () => {
    if (!data || !data.recipients) return
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Department', 'Viewed', 'First Viewed At', 'Acknowledged', 'Acknowledged At']
    const rows = data.recipients.map((r) => [
      r.user_id,
      `"${r.name}"`,
      `"${r.email || ''}"`,
      `"${r.role}"`,
      `"${r.department || ''}"`,
      r.has_viewed ? 'Yes' : 'No',
      r.first_viewed_at ? new Date(r.first_viewed_at).toLocaleString() : '-',
      r.has_acknowledged ? 'Yes' : 'No',
      r.acknowledged_at ? new Date(r.acknowledged_at).toLocaleString() : '-',
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `announcement_${announcementId}_analytics.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredRecipients = (data?.recipients || []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email && r.email.toLowerCase().includes(search.toLowerCase())) ||
      (r.department && r.department.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (filter === 'viewed') return r.has_viewed
    if (filter === 'unread') return !r.has_viewed
    if (filter === 'ack') return r.has_acknowledged
    if (filter === 'pending') return !r.has_acknowledged
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900">Announcement Engagement Analytics</h2>
            <p className="text-xs text-slate-600 truncate max-w-lg mt-0.5">{data?.title || 'Circular Metrics'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={loading || !data}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="w-3.5 h-3.5"><DownloadIcon /></span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-600 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <span className="w-5 h-5"><CloseIcon /></span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-600 font-semibold">Aggregating delivery metrics...</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Recipients</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{data.total_recipients}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Audience Total</p>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Viewed</span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{data.viewed_count}</p>
                <p className="text-[11px] text-emerald-700 font-bold mt-0.5">{data.view_rate_pct}% read rate</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Unread</span>
                <p className="text-2xl font-black text-slate-700 mt-1">{data.unread_count}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Pending opens</p>
              </div>

              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Acknowledged</span>
                <p className="text-2xl font-black text-blue-900 mt-1">{data.acknowledged_count}</p>
                <p className="text-[11px] text-blue-700 font-bold mt-0.5">{data.acknowledgement_rate_pct}% compliance</p>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Ack</span>
                <p className="text-2xl font-black text-amber-900 mt-1">{data.pending_acknowledgement_count}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Action required</p>
              </div>
            </div>

            {/* Recipient Breakdown Header & Filters */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'all', label: `All (${data.total_recipients})` },
                    { key: 'viewed', label: `Viewed (${data.viewed_count})` },
                    { key: 'unread', label: `Unread (${data.unread_count})` },
                    ...(data.requires_acknowledgement
                      ? [
                          { key: 'ack', label: `Acknowledged (${data.acknowledged_count})` },
                          { key: 'pending', label: `Pending Ack (${data.pending_acknowledgement_count})` },
                        ]
                      : []),
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        filter === tab.key
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search faculty or dept..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                  <span className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600">
                    <SearchIcon />
                  </span>
                </div>
              </div>

              {/* Recipient Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-4">Faculty Member</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">View Status</th>
                        <th className="py-2.5 px-3">First Viewed</th>
                        {data.requires_acknowledgement && (
                          <th className="py-2.5 px-3">Acknowledgement</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={data.requires_acknowledgement ? 5 : 4} className="py-8 text-center text-slate-600">
                            No faculty members match the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((r) => (
                          <tr key={r.user_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {r.name}
                              <span className="block text-[10px] font-normal text-slate-600">{r.email}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{r.department || 'General'}</td>
                            <td className="py-2.5 px-3">
                              {r.has_viewed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  <span className="w-2.5 h-2.5"><CheckCircleIcon /></span>
                                  <span>Viewed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Unread
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {r.first_viewed_at ? new Date(r.first_viewed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            {data.requires_acknowledgement && (
                              <td className="py-2.5 px-3">
                                {r.has_acknowledged ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 font-mono">
                                    <span>✓</span>
                                    <span>{new Date(r.acknowledged_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                    <span>⚠️</span>
                                    <span>Pending</span>
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
