import { useState, useEffect, useRef } from 'react'
import { PinIcon, MessageSquareIcon, CloseIcon } from '../../components/icons'
import { announcementApi } from '../../api/announcements'
import { useToast } from '../../components/ui/Toast'

const EMOJI_LIST = ['👍', '❤️', '✅', '❓', '👏']

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now - d) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MessageItem({
  message,
  announcementId,
  canReply,
  canModerate,
  currentUserId,
  onRefresh,
  onReplyClick,
  activeReplyId,
  setActiveReplyId,
  replyText,
  setReplyText,
  onSubmitReply,
  isSubmitting,
}) {
  const { showToast } = useToast()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const handleToggleReaction = async (emoji) => {
    try {
      await announcementApi.toggleReaction(message.id, emoji)
      setShowEmojiPicker(false)
      onRefresh()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update reaction', 'error')
    }
  }

  const handleTogglePin = async () => {
    try {
      await announcementApi.togglePinMessage(message.id)
      showToast(message.is_pinned ? 'Message unpinned' : 'Message pinned', 'success')
      onRefresh()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to pin message', 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await announcementApi.deleteMessage(message.id)
      showToast('Message removed', 'success')
      setConfirmingDelete(false)
      onRefresh()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to remove message', 'error')
    }
  }

  const initials = (message.author_name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const isAuthor = message.author_id === currentUserId

  return (
    <div className="group relative transition-all duration-200">
      <div className={`p-4 rounded-xl border transition-all ${
        message.is_pinned 
          ? 'bg-amber-50/70 border-amber-200/80 shadow-xs' 
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
      }`}>
        {/* Pinned Clarification Tag */}
        {message.is_pinned && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-2">
            <span className="w-3.5 h-3.5"><PinIcon /></span>
            <span>Pinned Clarification</span>
          </div>
        )}

        {/* Message Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900 truncate">{message.author_name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {message.author_role}
                </span>
                {message.author_department && (
                  <span className="text-[11px] text-slate-600 hidden sm:inline">
                    • {message.author_department}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                {formatRelativeTime(message.created_at)}
                {message.is_edited && ' (edited)'}
              </p>
            </div>
          </div>

          {/* Action Toolbar (Always visible on mobile touch screens, hover on desktop) */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {/* Reaction Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-xs"
                title="Add reaction"
              >
                😊
              </button>
              {showEmojiPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex items-center gap-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(emoji)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-base transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply trigger (top-level only or permitted) */}
            {canReply && (
              <button
                type="button"
                onClick={() => {
                  if (activeReplyId === message.id) {
                    setActiveReplyId(null)
                  } else {
                    setActiveReplyId(message.id)
                    setReplyText(`@${message.author_name} `)
                  }
                }}
                className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <span className="w-3.5 h-3.5"><MessageSquareIcon /></span>
                <span>Reply</span>
              </button>
            )}

            {/* Moderator pin */}
            {canModerate && (
              <button
                type="button"
                onClick={handleTogglePin}
                className={`p-1 rounded-lg transition-colors ${
                  message.is_pinned ? 'text-amber-600 hover:bg-amber-100' : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={message.is_pinned ? 'Unpin reply' : 'Pin reply'}
              >
                <span className="w-3.5 h-3.5"><PinIcon /></span>
              </button>
            )}

            {/* Delete button (Author or Moderator) */}
            {(isAuthor || canModerate) && !message.is_deleted && (
              confirmingDelete ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg text-xs animate-in fade-in duration-100">
                  <span className="text-[11px] font-bold text-rose-700">Delete reply?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="font-extrabold text-rose-700 hover:underline text-[11px]"
                  >
                    Yes
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="text-slate-500 hover:text-slate-700 text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete message"
                >
                  <span className="w-3.5 h-3.5"><CloseIcon /></span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Message Body */}
        <div className="mt-2.5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {message.reactions.map((rx) => (
              <button
                key={rx.reaction}
                type="button"
                onClick={() => handleToggleReaction(rx.reaction)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  rx.has_reacted
                    ? 'bg-primary-50 text-primary-700 border border-primary-200/80 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-150 border border-slate-200/60'
                }`}
                title={rx.user_names?.join(', ') || ''}
              >
                <span>{rx.reaction}</span>
                <span>{rx.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline Nested Reply Box */}
      {activeReplyId === message.id && (
        <div className="mt-3 ml-8 pl-3 border-l-2 border-primary-300">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">Replying to {message.author_name}</span>
              <button
                type="button"
                onClick={() => setActiveReplyId(null)}
                className="text-slate-600 hover:text-slate-700"
              >
                <span className="w-3.5 h-3.5"><CloseIcon /></span>
              </button>
            </div>
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply... (use @name to mention)"
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setActiveReplyId(null)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !replyText.trim()}
                onClick={() => onSubmitReply(message.id)}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nested Replies Stream */}
      {message.replies && message.replies.length > 0 && (
        <div className="mt-3 ml-6 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-slate-200 space-y-3">
          {message.replies.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              announcementId={announcementId}
              canReply={canReply}
              canModerate={canModerate}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              onReplyClick={onReplyClick}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={onSubmitReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ConversationThread({
  announcementId,
  messages = [],
  allowReplies = true,
  isLocked = false,
  canModerate = false,
  currentUserId,
  onRefresh,
}) {
  const { showToast } = useToast()
  const [rootText, setRootText] = useState('')
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [candidateList, setCandidateList] = useState([])
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)

  useEffect(() => {
    announcementApi.getCandidates()
      .then(res => setCandidateList(res.data?.faculty || []))
      .catch(() => {})
  }, [])

  const handlePostRootMessage = async (e) => {
    e.preventDefault()
    if (!rootText.trim()) return

    setIsSubmitting(true)
    try {
      await announcementApi.postMessage(announcementId, {
        content: rootText.trim(),
      })
      setRootText('')
      showToast('Comment posted', 'success')
      onRefresh()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to post comment', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim()) return

    setIsSubmitting(true)
    try {
      await announcementApi.postMessage(announcementId, {
        content: replyText.trim(),
        parent_message_id: parentId,
      })
      setReplyText('')
      setActiveReplyId(null)
      showToast('Reply posted', 'success')
      onRefresh()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to post reply', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRootTextChange = (e) => {
    const val = e.target.value
    setRootText(val)

    // Check for @mention trigger
    const lastAtIdx = val.lastIndexOf('@')
    if (lastAtIdx !== -1 && (lastAtIdx === val.length - 1 || !/\s/.test(val.slice(lastAtIdx)))) {
      const q = val.slice(lastAtIdx + 1).toLowerCase()
      setMentionQuery(q)
      setShowMentionSuggestions(true)
    } else {
      setShowMentionSuggestions(false)
    }
  }

  const handleSelectMention = (faculty) => {
    const lastAtIdx = rootText.lastIndexOf('@')
    if (lastAtIdx !== -1) {
      const prefix = rootText.slice(0, lastAtIdx)
      setRootText(`${prefix}@${faculty.name} `)
    }
    setShowMentionSuggestions(false)
  }

  const filteredFaculty = candidateList.filter(f => 
    !mentionQuery || f.name.toLowerCase().includes(mentionQuery) || (f.department_name && f.department_name.toLowerCase().includes(mentionQuery))
  ).slice(0, 5)

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-primary-600"><MessageSquareIcon /></span>
          <h3 className="font-extrabold text-base text-slate-900">Institutional Conversation</h3>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {messages.length}
          </span>
        </div>
        {isLocked && (
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            🔒 Conversation Locked
          </span>
        )}
      </div>

      {/* Root Composer Box with Mobile @Mention Popover */}
      {allowReplies && !isLocked ? (
        <form onSubmit={handlePostRootMessage} className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all relative">
          <textarea
            rows={3}
            value={rootText}
            onChange={handleRootTextChange}
            placeholder="Write a clarification or institutional comment... (type @ to mention)"
            className="w-full text-sm bg-white border border-slate-200 rounded-lg p-3 focus:outline-hidden focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-slate-600"
          />

          {/* Touch-friendly @Mention Autocomplete Dropdown */}
          {showMentionSuggestions && filteredFaculty.length > 0 && (
            <div className="absolute left-4 right-4 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="p-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Mention Faculty Member
              </div>
              {filteredFaculty.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectMention(f)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors active:bg-primary-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {f.name[0]}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {f.name}
                    </span>
                  </div>
                  {f.department_name && (
                    <span className="text-[10px] text-slate-500 font-medium shrink-0">
                      {f.department_name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/80">
            <span className="text-[11px] text-slate-600 font-medium">
              Discussion thread • Type @ to mention
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !rootText.trim()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 text-center mb-6">
          {isLocked ? 'Replies are locked for this circular.' : 'Replies have been disabled by the publisher.'}
        </div>
      )}

      {/* Message Tree */}
      {messages.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-600 text-sm">
          No comments yet. Be the first to start the conversation.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              announcementId={announcementId}
              canReply={allowReplies && !isLocked}
              canModerate={canModerate}
              currentUserId={currentUserId}
              onRefresh={onRefresh}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={handleSubmitReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
