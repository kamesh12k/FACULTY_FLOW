import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_NAV, TEACHER_NAV, SYSTEM_ADMIN_NAV, PRINCIPAL_NAV } from './Sidebar'
import { SettingsIcon, LogoutIcon, CloseIcon } from '../icons'

export default function MobileDrawer({ open, onClose }) {
  const { user, isAdmin, isSystemAdmin, isPrincipal, logout } = useAuth()
  const navigate = useNavigate()
  
  let nav = TEACHER_NAV
  if (isSystemAdmin) {
    nav = SYSTEM_ADMIN_NAV
  } else if (isPrincipal) {
    nav = PRINCIPAL_NAV
  } else if (isAdmin) {
    nav = ADMIN_NAV
  }


  if (!open) return null

  const handleLogout = () => { logout(); navigate('/login'); onClose() }

  return (
    <div className="lg:hidden fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-primary-900 flex flex-col shadow-xl animate-[slideIn_0.18s_ease-out]">
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{user?.name}</p>
            <p className="text-primary-100/50 text-xs capitalize">{user?.role}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {nav.map((group, i) => (
            <div key={i}>
              {group.section && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary-100/40">{group.section}</p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    <span className="w-5 h-5 shrink-0">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 pb-6 border-t border-white/10 pt-3 space-y-1">
          {isAdmin && !isPrincipal && (
            <NavLink
              to="/admin/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <SettingsIcon className="w-5 h-5" />
              Settings
            </NavLink>
          )}
          {!isAdmin && (
            <NavLink
              to="/teacher/preferences"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <SettingsIcon className="w-5 h-5" />
              Substitution Preferences
            </NavLink>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10">
            <LogoutIcon className="w-5 h-5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
