import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CloseIcon, PrinterIcon, DownloadIcon, CheckCircleIcon,
  AlertTriangleIcon, PinIcon, LockIcon, SettingsIcon, TrashIcon
} from '../../components/icons'
import { Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { announcementApi } from '../../api/announcements'
import ConversationThread from './ConversationThread'
import AnnouncementAnalyticsModal from './AnnouncementAnalyticsModal'

export default function AnnouncementDetail({ announcementId: propId, onClose, onRefreshList }) {
  const { id: routeId } = useParams()
  const announcementId = propId || routeId
  const navigate = useNavigate()
  const { user, isPrincipal, isAdmin, isSystemAdmin } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchDetail = async () => {
    try {
      const res = await announcementApi.getAnnouncementDetail(announcementId)
      setData(res.data)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to load announcement details', 'error')
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await announcementApi.getConversationMessages(announcementId)
      setMessages(res.data)
    } catch (err) {
      console.warn('Could not load messages', err)
    }
  }

  useEffect(() => {
    if (!announcementId) return
    setLoading(true)
    Promise.all([fetchDetail(), fetchMessages()]).finally(() => setLoading(false))
  }, [announcementId])

  const handleAcknowledge = async () => {
    setAcknowledging(true)
    try {
      await announcementApi.acknowledgeAnnouncement(announcementId)
      showToast('Formal acknowledgement recorded successfully', 'success')
      fetchDetail()
      if (onRefreshList) onRefreshList()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Acknowledgement failed', 'error')
    } finally {
      setAcknowledging(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await announcementApi.deleteAnnouncement(announcementId)
      showToast('Announcement permanently deleted', 'success')
      setShowDeleteModal(false)
      if (onRefreshList) onRefreshList(`Announcement "${data?.title || ''}" was deleted`)
      if (onClose) onClose()
      else navigate('/announcements')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete announcement', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-600 font-semibold">Loading official circular...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-slate-600 text-sm">
        Announcement not found or access restricted.
      </div>
    )
  }

  const priorityBadgeClasses = {
    NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
    IMPORTANT: 'bg-amber-100 text-amber-800 border-amber-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    URGENT: 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold',
  }[data.priority] || 'bg-slate-100 text-slate-700'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2.5 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose ? onClose : () => navigate('/announcements')}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0 flex items-center gap-1"
            title="Back to Announcements"
          >
            <span className="text-base font-black">←</span>
            <span className="text-xs font-bold sm:hidden">Back</span>
          </button>
          {data.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
              <span className="w-3 h-3"><PinIcon /></span>
              <span className="hidden sm:inline">Pinned</span>
            </span>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${priorityBadgeClasses}`}>
            {data.priority}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/80 text-slate-800 shrink-0">
            {data.type}
          </span>
          {data.version > 1 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              v{data.version}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {data.can_view_analytics && (
            <button
              type="button"
              onClick={() => setShowAnalytics(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-colors"
            >
              📊 <span className="hidden sm:inline">Analytics</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors hidden sm:inline-flex"
            title="Print circular"
          >
            <span className="w-4 h-4"><PrinterIcon /></span>
          </button>
          {data.can_delete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
              title="Permanently delete announcement"
            >
              <TrashIcon className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg hidden sm:inline-flex"
            >
              <span className="w-5 h-5"><CloseIcon /></span>
            </button>
          )}
        </div>
      </div>

      {/* Main Official Content */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Revision Alert (if updated) */}
        {data.version > 1 && (
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
            <span className="text-base">ℹ️</span>
            <div>
              <p className="font-extrabold text-indigo-900">
                Updated Circular (Version {data.version})
              </p>
              {data.revision_notes && (
                <p className="text-indigo-800/90 mt-0.5 font-medium">{data.revision_notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Circular Official Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-700 mb-1">
            Institutional Communication • Circular #{data.id}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
            {data.title}
          </h1>

          <div className="mt-3.5 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-primary-600 text-white font-bold text-[10px] flex items-center justify-center">
                {data.author_name?.[0] || 'A'}
              </span>
              <span className="font-bold text-slate-900">{data.author_name}</span>
              <span className="text-slate-600 font-medium">({data.author_role})</span>
            </div>
            <span>•</span>
            <span>{data.published_at ? new Date(data.published_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Draft'}</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">
              Audience: {data.target_summary === 'COLLEGE' ? 'Entire College' : data.target_summary}
            </span>
          </div>
        </div>

        {/* Circular Body */}
        <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-wrap font-sans space-y-4">
          {data.body}
        </div>

        {/* Official Attachments List */}
        {data.attachments && data.attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">
              Official Documents & Attachments ({data.attachments.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.attachments.map((att) => {
                const isPdf = att.file_type.includes('pdf') || att.file_name.endsWith('.pdf')
                const isImg = att.file_type.includes('image') || /\.(jpg|jpeg|jfif|png|webp|gif|bmp)$/i.test(att.file_name)
                const sizeMb = (att.file_size / (1024 * 1024)).toFixed(2)
                const sizeKb = Math.round(att.file_size / 1024)
                const sizeDisplay = att.file_size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`

                return (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isImg ? (
                        <img
                          src={att.download_url}
                          alt={att.file_name}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-white cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewAttachment(att)}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0">
                          {isPdf ? '📄' : '📎'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={att.file_name}>
                          {att.file_name}
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono">{sizeDisplay}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(isImg || isPdf) && (
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(att)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                        >
                          Preview
                        </button>
                      )}
                      <a
                        href={att.download_url}
                        download={att.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <span className="w-3.5 h-3.5"><DownloadIcon /></span>
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mandatory Formal Acknowledgement Card */}
        {data.requires_acknowledgement && (
          <div className="pt-4 border-t border-slate-200">
            {data.is_acknowledged ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <span className="w-5 h-5"><CheckCircleIcon /></span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-950">Circular Formally Acknowledged</h4>
                    <p className="text-xs text-emerald-800">
                      You confirmed receipt and understanding on{' '}
                      <span className="font-mono font-bold">
                        {new Date(data.acknowledged_at).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                  COMPLIANT
                </span>
              </div>
            ) : (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">⚠️</span>
                  <div>
                    <h4 className="font-black text-sm text-amber-950 uppercase tracking-wide">
                      Formal Institutional Acknowledgement Required
                    </h4>
                    <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                      By clicking below, you formally certify that you have received, read, and thoroughly understood the contents and obligations detailed in this institutional notice.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={acknowledging}
                    onClick={handleAcknowledge}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {acknowledging && <Spinner size="sm" className="border-white border-t-transparent" />}
                    <span>✓ I ACKNOWLEDGE THIS CIRCULAR</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conversation Thread Component */}
        <ConversationThread
          announcementId={announcementId}
          messages={messages}
          allowReplies={data.allow_replies}
          isLocked={data.is_locked}
          canModerate={data.can_moderate}
          currentUserId={user?.id}
          onRefresh={fetchMessages}
        />
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnnouncementAnalyticsModal
          announcementId={announcementId}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Attachment Preview Modal (PDF & Images) */}
      {previewAttachment && (
        <div
          onClick={() => setPreviewAttachment(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col relative"
          >
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">
                  {previewAttachment.file_type.includes('pdf') || previewAttachment.file_name.endsWith('.pdf') ? '📄' : '🖼️'}
                </span>
                <span className="font-bold text-xs sm:text-sm truncate">{previewAttachment.file_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.download_url}
                  download={previewAttachment.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span className="w-3.5 h-3.5"><DownloadIcon /></span>
                  <span>Save</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <span className="w-5 h-5"><CloseIcon /></span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-2">
              {previewAttachment.file_type.includes('pdf') || previewAttachment.file_name.endsWith('.pdf') ? (
                <iframe
                  src={previewAttachment.download_url}
                  title={previewAttachment.file_name}
                  className="w-full h-full rounded-lg border-0 shadow-inner bg-white"
                />
              ) : (
                <img
                  src={previewAttachment.download_url}
                  alt={previewAttachment.file_name}
                  className="max-w-full max-h-full object-contain mx-auto rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">Delete Announcement Circular?</h3>
                <p className="text-xs text-slate-500 font-medium">Confirm permanent deletion</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Circular</span>
              <p className="font-extrabold text-slate-900 text-sm line-clamp-2">{data?.title}</p>
              <div className="flex items-center gap-2 text-slate-500 pt-0.5">
                <span>Category: <strong className="text-slate-700 font-semibold">{data?.type}</strong></span>
                <span>•</span>
                <span>Priority: <strong className="text-slate-700 font-semibold">{data?.priority}</strong></span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200/80 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <span>⚠️</span> Permanent & Irreversible Action
              </p>
              <p className="leading-relaxed text-[11px]">
                Deleting this circular will immediately revoke access across all faculty dashboards and feeds. All uploaded files, faculty acknowledgements, and conversation replies will be permanently purged.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel, Keep Circular
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Spinner size="xs" className="border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Announcement</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
