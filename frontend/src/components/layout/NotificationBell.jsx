import { useEffect, useRef, useState } from 'react'
import { notificationsApi } from '../../api/services'
import { BellIcon, CheckCircleIcon, SwapIcon, CalIcon, XCircleIcon } from '../icons'

const EVENT_ICON = {
  leave_approved: CheckCircleIcon,
  leave_rejected: XCircleIcon,
  substitute_assigned: SwapIcon,
  holiday_reminder: CalIcon,
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  const refreshCount = () => {
    notificationsApi.unreadCount().then(r => setUnread(r.data.count)).catch(() => {})
  }

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleToggle = () => {
    setOpen(o => !o)
    if (!loaded) {
      notificationsApi.list().then(r => { setItems(r.data); setLoaded(true) })
    }
  }

  const handleMarkAll = async () => {
    await notificationsApi.markAllRead()
    setItems(items.map(i => ({ ...i, is_read: true })))
    setUnread(0)
  }

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      await notificationsApi.markRead(item.id)
      setItems(items.map(i => i.id === item.id ? { ...i, is_read: true } : i))
      setUnread(u => Math.max(0, u - 1))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleToggle} className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
        <BellIcon className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary-600 hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">You're all caught up.</p>
            ) : items.map(item => {
              const Icon = EVENT_ICON[item.event_type] || BellIcon
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 ${!item.is_read ? 'bg-primary-50/40' : ''}`}
                >
                  <span className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${!item.is_read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
                  </span>
                  {!item.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
