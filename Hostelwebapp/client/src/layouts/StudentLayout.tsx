import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, CalendarCheck, MessageSquarePlus,
  AlertTriangle, CreditCard, Bell, Settings, LogOut,
  Building2, Menu, X, BellDot, Phone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { studentService } from '@/services/studentService'
import clsx from 'clsx'

const navItems = [
  { to: '/student/dashboard',           label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/student/profile',             label: 'Profile',            icon: User },
  { to: '/student/attendance',          label: 'Attendance',         icon: CalendarCheck },
  { to: '/student/requests',            label: 'Raise Request',      icon: MessageSquarePlus },
  { to: '/student/problems',            label: 'Raise a Problem',    icon: AlertTriangle },
  { to: '/student/fees',                label: 'Fees',               icon: CreditCard },
  { to: '/student/notices',             label: 'Notices',            icon: Bell },
  { to: '/student/notifications',       label: 'Notifications',      icon: BellDot, badge: true },
  { to: '/student/emergency-contacts',  label: 'Emergency Contacts', icon: Phone },
  { to: '/student/settings',            label: 'Settings',           icon: Settings },
]

function SidebarLink({
  to, label, Icon, badge, unreadCount, onClick,
}: {
  to: string; label: string; Icon: React.ElementType
  badge?: boolean; unreadCount?: number; onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
          isActive
            ? 'bg-primary-600 text-white shadow-glow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative shrink-0">
            <Icon
              size={18}
              className={clsx(
                'transition-transform group-hover:scale-110',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
              )}
            />
            {badge && unreadCount && unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </div>
          <span className="truncate flex-1">{label}</span>
          {badge && unreadCount && unreadCount > 0 ? (
            <span className={clsx(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
              isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export default function StudentLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const res = await studentService.getUnreadCount()
        if (!cancelled && res.success && res.data) setUnreadCount(res.data.count)
      } catch { /* silent */ }
    }
    fetch()
    const interval = setInterval(fetch, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex flex-col h-full p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow-sm shrink-0">
          <Building2 size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">HMS</p>
          <p className="text-xs text-slate-400 truncate">Student Portal</p>
        </div>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User chip */}
      <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary-700">{user?.name?.charAt(0).toUpperCase() ?? 'S'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.name ?? 'Student'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.usn ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <SidebarLink
            key={to}
            to={to}
            label={label}
            Icon={Icon}
            badge={badge}
            unreadCount={badge ? unreadCount : undefined}
            onClick={mobile ? () => setMobileOpen(false) : undefined}
          />
        ))}
      </div>

      {/* Logout */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <LogOut size={18} className="shrink-0 transition-transform group-hover:scale-110" />
          Logout
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 fixed top-0 left-0 h-full z-30 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={clsx('fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl transition-transform duration-300 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent mobile />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 glass border-b border-white/60 shadow-sm">
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold text-slate-700">HMS</span>
            </div>
            <div className="relative w-9 flex items-center justify-center">
              {unreadCount > 0 && (
                <NavLink to="/student/notifications" className="relative p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                  <BellDot size={20} />
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </NavLink>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
