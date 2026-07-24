import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useDepartment } from '../../context/DepartmentContext'
import { BRAND_CONFIG } from '../../config/branding'
import {
  GridIcon, UsersIcon, CalIcon, BookIcon, DoorIcon, DocIcon, ChartIcon,
  PlusIcon, SettingsIcon, LogoutIcon, SwapIcon, ChevronDownIcon,
} from '../icons'

function NavItem({ to, icon, label, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all group relative ${
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
        }`
      }
    >
      <span className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      
      {/* Collapsed Tooltip */}
      {collapsed && (
        <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg border border-slate-800 z-50 whitespace-nowrap">
          {label}
        </div>
      )}
    </NavLink>
  )
}

const ADMIN_NAV = [
  {
    section: null,
    items: [
      { to: '/admin/dashboard', label: 'Home', icon: <GridIcon />, end: true },
    ],
  },
  {
    section: 'Calendar & Timetable',
    items: [
      { to: '/admin/academic-calendar', label: 'Calendar & Day Order', icon: <CalIcon /> },
      { to: '/admin/timetable', label: 'Timetable', icon: <CalIcon /> },
      { to: '/admin/timetable/import', label: 'Import Timetable', icon: <PlusIcon /> },
      { to: '/admin/timetable/approvals', label: 'Timetable Approvals', icon: <DocIcon /> },
      { to: '/admin/class-directory', label: 'Class Faculty Directory', icon: <UsersIcon /> },
      { to: '/admin/resource-availability', label: 'Room Availability', icon: <ChartIcon /> },
    ],
  },
  {
    section: 'Leave & Credits',
    items: [
      { to: '/admin/leaves', label: 'Leave Requests', icon: <DocIcon /> },
      { to: '/admin/leave-entry', label: 'Admin Leave Entry', icon: <PlusIcon /> },
      { to: '/admin/today-substitutions', label: "Today's Substitutions", icon: <DocIcon /> },
      { to: '/admin/credits', label: 'Credits', icon: <ChartIcon /> },
    ],
  },
  {
    section: 'Setup',
    items: [
      { to: '/admin/teachers', label: 'Teachers', icon: <UsersIcon /> },
      { to: '/admin/subjects', label: 'Subjects', icon: <BookIcon /> },
      { to: '/admin/classes', label: 'Classes', icon: <UsersIcon /> },
      { to: '/admin/rooms', label: 'Rooms & Labs', icon: <DoorIcon /> },
    ],
  },
]

const TEACHER_NAV = [
  {
    section: null,
    items: [
      { to: '/teacher/dashboard', label: 'Home', icon: <GridIcon />, end: true },
      { to: '/teacher/timetable', label: 'My Timetable', icon: <CalIcon /> },
      { to: '/teacher/class-directory', label: 'Class Faculty Directory', icon: <UsersIcon /> },
      { to: '/teacher/leave/apply', label: 'Apply for Leave', icon: <PlusIcon /> },
      { to: '/teacher/leaves', label: 'Leave History', icon: <DocIcon /> },
      { to: '/teacher/substitution', label: 'Manage Substitutes', icon: <SwapIcon /> },
      { to: '/teacher/today-coverage', label: "Today's Coverage", icon: <DocIcon /> },
      { to: '/teacher/credits', label: 'My Credits', icon: <ChartIcon /> },
    ],
  },
]

const SYSTEM_ADMIN_NAV = [
  {
    section: 'System Setup',
    items: [
      { to: '/admin/departments', label: 'Departments', icon: <UsersIcon />, end: true },
    ],
  },
  {
    section: 'Performance',
    items: [
      { to: '/admin/system-metrics', label: 'Real-time Traffic', icon: <ChartIcon /> },
    ],
  },
]

const PRINCIPAL_NAV = [
  {
    section: null,
    items: [
      { to: '/principal/dashboard', label: 'Home', icon: <GridIcon />, end: true },
    ],
  },
]

export default function Sidebar() {
  const { user, isAdmin, isSystemAdmin, isPrincipal, logout } = useAuth()
  const { app_name, themePreset } = useTheme() || {}
  const { departments, activeDepartmentId, setActiveDepartmentId, activeDepartmentName } = useDepartment()
  const navigate = useNavigate()
  
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('faflow_sidebar_collapsed') === 'true'
  })
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)

  const toggleCollapse = () => {
    const nextVal = !collapsed
    setCollapsed(nextVal)
    localStorage.setItem('faflow_sidebar_collapsed', String(nextVal))
  }

  let nav = TEACHER_NAV
  if (isSystemAdmin) {
    nav = SYSTEM_ADMIN_NAV
  } else if (isPrincipal) {
    nav = PRINCIPAL_NAV
  } else if (isAdmin) {
    nav = ADMIN_NAV
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const sidebarCls = themePreset?.sidebarStyle === 'dark' 
    ? 'bg-slate-950 border-slate-850 text-white' 
    : 'bg-white border-slate-150 text-slate-800'

  return (
    <aside className={`hidden lg:flex shrink-0 border-r min-h-screen flex-col transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-64'} ${sidebarCls}`}>
      {/* Sidebar Header with Toggle & Logo */}
      <div className={`px-5.5 py-4 border-b flex items-center justify-between gap-3 ${themePreset?.sidebarStyle === 'dark' ? 'border-slate-850' : 'border-slate-100'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl leading-none shrink-0">{BRAND_CONFIG.logoEmoji}</span>
            <p className="font-extrabold text-base tracking-tight truncate">{app_name || BRAND_CONFIG.appName}</p>
          </div>
        )}
        {collapsed && (
          <span className="text-xl leading-none mx-auto cursor-pointer" onClick={toggleCollapse}>{BRAND_CONFIG.logoEmoji}</span>
        )}
        {!collapsed && (
          <button 
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg transition-colors ${themePreset?.sidebarStyle === 'dark' ? 'hover:bg-slate-850 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Workspace / Department Switcher */}
      {!collapsed && isSystemAdmin && departments.length > 0 && (
        <div className="px-4 py-3 relative border-b border-slate-100/10">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              themePreset?.sidebarStyle === 'dark' 
                ? 'bg-slate-900/50 border-slate-850 text-slate-200 hover:bg-slate-900' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm shrink-0">{BRAND_CONFIG.organizationLogo}</span>
              <span className="truncate">{activeDepartmentName}</span>
            </div>
            <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
          
          {showWorkspaceMenu && (
            <div className={`absolute left-4 right-4 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-xl p-1.5 space-y-0.5 ${
              themePreset?.sidebarStyle === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => { setActiveDepartmentId(null); setShowWorkspaceMenu(false) }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeDepartmentId === null 
                    ? 'bg-primary-600 text-white' 
                    : 'text-slate-450 hover:bg-slate-100/10 hover:text-slate-100'
                }`}
              >
                All Departments
              </button>
              {departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => { setActiveDepartmentId(dept.id); setShowWorkspaceMenu(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all truncate ${
                    activeDepartmentId === dept.id 
                      ? 'bg-primary-600 text-white' 
                      : 'text-slate-450 hover:bg-slate-100/10 hover:text-slate-100'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {nav.map((group, i) => (
          <div key={i} className="space-y-1.5">
            {!collapsed && group.section && (
              <p className={`px-3.5 text-[9px] font-bold uppercase tracking-wider ${
                themePreset?.sidebarStyle === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>{group.section}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className={`px-3 pb-5 border-t pt-3 space-y-1.5 ${themePreset?.sidebarStyle === 'dark' ? 'border-slate-850' : 'border-slate-100'}`}>
        {/* Toggle Collapse Button for Collapsed Sidebar */}
        {collapsed && (
          <button 
            onClick={toggleCollapse}
            className={`w-full flex items-center justify-center p-2 rounded-xl transition-all mb-1 ${
              themePreset?.sidebarStyle === 'dark' ? 'hover:bg-slate-850 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Action Link (Settings / Preferences) */}
        {isAdmin && !isPrincipal && (
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`
            }
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
            {collapsed && (
              <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg border border-slate-800 z-50 whitespace-nowrap">
                Settings
              </div>
            )}
          </NavLink>
        )}
        {!isAdmin && (
          <NavLink
            to="/teacher/preferences"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group relative ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`
            }
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Preferences</span>}
            {collapsed && (
              <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg border border-slate-800 z-50 whitespace-nowrap">
                Preferences
              </div>
            )}
          </NavLink>
        )}

        {/* User Card */}
        {!collapsed ? (
          <div className={`px-3 py-2.5 rounded-xl mt-1.5 flex items-center justify-between border ${
            themePreset?.sidebarStyle === 'dark' ? 'bg-slate-900/40 border-slate-850/50' : 'bg-slate-50/50 border-slate-100'
          }`}>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className={`p-1.5 rounded-lg transition-colors hover:bg-rose-500/10 text-slate-450 hover:text-rose-500`}
              title="Sign out"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-450 hover:text-rose-500 hover:bg-rose-500/10 transition-all group relative"
          >
            <LogoutIcon className="w-5 h-5 shrink-0" />
            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg border border-slate-800 z-50 whitespace-nowrap">
              Sign out
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}

export { ADMIN_NAV, TEACHER_NAV, SYSTEM_ADMIN_NAV, PRINCIPAL_NAV }
