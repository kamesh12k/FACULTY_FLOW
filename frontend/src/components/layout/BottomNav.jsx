import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { announcementApi } from '../../api/announcements'
import { GridIcon, CalIcon, DocIcon, PlusIcon, ChartIcon, MenuIcon, DoorIcon, UsersIcon, BookIcon, SwapIcon, MegaphoneIcon } from '../icons'

const ADMIN_TABS = [
  { to: '/admin/dashboard', label: 'Home', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
  { to: '/admin/academic-calendar', label: 'Calendar', icon: CalIcon },
  { to: '/admin/leaves', label: 'Leaves', icon: DocIcon },
]

const TEACHER_TABS = [
  { to: '/teacher/dashboard', label: 'Home', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
  { to: '/teacher/timetable', label: 'Timetable', icon: CalIcon },
  { to: '/teacher/leaves', label: 'Leaves', icon: DocIcon },
]

const SYSTEM_ADMIN_TABS = [
  { to: '/admin/departments', label: 'Departments', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
]

const PRINCIPAL_TABS = [
  { to: '/principal/dashboard', label: 'Home', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
]

const MANAGER_TABS = [
  { to: '/manager/dashboard', label: 'Home', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
  { to: '/manager/lab-staff', label: 'Lab Staff', icon: DoorIcon },
  { to: '/manager/leaves', label: 'Leaves', icon: DocIcon },
]

const STAFF_TABS = [
  { to: '/staff/dashboard', label: 'Workspace', icon: GridIcon, end: true },
  { to: '/announcements', label: 'Notices', icon: MegaphoneIcon, badgeKey: 'announcements' },
  { to: '/staff/leaves', label: 'My Leaves', icon: DocIcon },
]


const GOVERNANCE_TABS = [
  { to: '/governance', label: 'Home', icon: GridIcon, end: true },
  { to: '/admin/today-substitutions', label: 'Alerts', icon: SwapIcon },
]

export default function BottomNav({ onMoreClick }) {
  const { user, isAdmin, isSystemAdmin, isPrincipal, isGovernance, isManager, isStaff } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchUnread = () => {
      announcementApi.getUnreadCount()
        .then((res) => setUnreadCount(res.data?.count || 0))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [user])

  const tabs = isGovernance
    ? GOVERNANCE_TABS
    : (isSystemAdmin
      ? SYSTEM_ADMIN_TABS
      : (isPrincipal
        ? PRINCIPAL_TABS
        : (isManager
          ? MANAGER_TABS
          : (isStaff
            ? STAFF_TABS
            : (isAdmin ? ADMIN_TABS : TEACHER_TABS)))))

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div 
        className="grid" 
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ to, label, icon: Icon, end, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-primary-600 font-bold' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badgeKey === 'announcements' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-gray-400 hover:text-gray-600"
        >
          <MenuIcon className="w-5 h-5" />
          More
        </button>
      </div>
    </nav>
  )
}
