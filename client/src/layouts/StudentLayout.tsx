import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, User, CalendarCheck, MessageSquarePlus,
  AlertTriangle, CreditCard, Bell, Settings, LogOut,
  Building2, Menu, X, BellDot, Phone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { studentService } from '@/services/studentService'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

const navItems = [
  { to: '/student/dashboard',          label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/student/profile',            label: 'Profile',            icon: User },
  { to: '/student/attendance',         label: 'Attendance',         icon: CalendarCheck },
  { to: '/student/requests',           label: 'Raise Request',      icon: MessageSquarePlus },
  { to: '/student/problems',           label: 'Raise a Problem',    icon: AlertTriangle },
  { to: '/student/fees',               label: 'Fees',               icon: CreditCard },
  { to: '/student/notices',            label: 'Notices',            icon: Bell },
  { to: '/student/notifications',      label: 'Notifications',      icon: BellDot, badge: true },
  { to: '/student/emergency-contacts', label: 'Emergency Contacts', icon: Phone },
  { to: '/student/settings',           label: 'Settings',           icon: Settings },
]

function SidebarLink({
  to, label, Icon, badge, unreadCount, onClick,
}: {
  to: string; label: string; Icon: React.ElementType
  badge?: boolean; unreadCount?: number; onClick?: () => void
}) {
  const { isDark } = useTheme()
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
        isActive
          ? isDark
            ? 'bg-accent-600/20 text-accent-300 border border-accent-600/30'
            : 'bg-accent-600/10 text-accent-700 border border-accent-600/20'
          : isDark
            ? 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
      )}
    >
      {({ isActive }) => (
        <>
          <div className="relative shrink-0">
            <Icon size={17} className={clsx(
              'transition-transform group-hover:scale-110',
              isActive
                ? isDark ? 'text-accent-400' : 'text-accent-600'
                : isDark ? 'text-zinc-500 group-hover:text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-600'
            )} />
            {badge && unreadCount && unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </div>
          <span className="truncate flex-1">{label}</span>
          {badge && unreadCount && unreadCount > 0 ? (
            <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              isActive ? 'bg-red-500/20 text-red-400' : 'bg-red-500/15 text-red-400')}>
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
  const { isDark } = useTheme()
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

  const handleLogout = () => { logout(); navigate('/', { replace: true }) }

  const sidebarBg = isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200'
  const headerBg  = isDark ? 'bg-dark-950/90 border-white/5' : 'bg-white/90 border-zinc-200'
  const mainBg    = isDark ? 'bg-dark-950' : 'bg-zinc-50'

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={clsx('flex flex-col h-full p-4 border-r', sidebarBg)}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 0 12px rgba(59,110,244,0.4)' }}>
          <Building2 size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className={clsx('text-xs font-bold font-mono uppercase tracking-widest truncate', isDark ? 'text-zinc-300' : 'text-zinc-700')}>SVCE</p>
          <p className={clsx('text-[10px] truncate', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Girls Hostel</p>
        </div>
        {mobile && (
          <button onClick={() => setMobileOpen(false)}
            className={clsx('ml-auto p-1 rounded-lg transition-colors', isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* User chip */}
      <div className={clsx('rounded-xl p-3 mb-5 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
        <div className="flex items-center gap-2.5">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs',
            isDark ? 'bg-accent-600/20 text-accent-400' : 'bg-blue-100 text-blue-700')}>
            {user?.name?.charAt(0).toUpperCase() ?? 'S'}
          </div>
          <div className="min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{user?.name ?? 'Student'}</p>
            <p className={clsx('text-[10px] truncate font-mono', isDark ? 'text-zinc-600' : 'text-zinc-400')}>{user?.usn ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <SidebarLink key={to} to={to} label={label} Icon={Icon}
            badge={badge} unreadCount={badge ? unreadCount : undefined}
            onClick={mobile ? () => setMobileOpen(false) : undefined} />
        ))}
      </div>

      {/* Theme + Logout */}
      <div className={clsx('mt-4 pt-4 border-t space-y-2', isDark ? 'border-white/5' : 'border-zinc-100')}>
        <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl', isDark ? 'bg-dark-800/50' : 'bg-zinc-50')}>
          <span className={clsx('text-xs font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <ThemeToggle />
        </div>
        <button onClick={handleLogout}
          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
            isDark ? 'text-zinc-500 hover:bg-red-500/10 hover:text-red-400' : 'text-zinc-400 hover:bg-red-50 hover:text-red-600')}>
          <LogOut size={17} className="shrink-0 transition-transform group-hover:scale-110" />
          Logout
        </button>
      </div>
    </nav>
  )

  return (
    <div className={clsx('min-h-screen flex transition-colors duration-300', mainBg)}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={clsx('fixed top-0 left-0 h-full w-72 z-50 shadow-2xl transition-transform duration-300 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent mobile />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className={clsx('lg:hidden sticky top-0 z-20 border-b backdrop-blur-md', headerBg)}>
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setMobileOpen(true)}
              className={clsx('p-2 rounded-xl transition-colors', isDark ? 'text-zinc-400 hover:bg-white/5' : 'text-zinc-500 hover:bg-zinc-100')}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-accent-600 flex items-center justify-center">
                <Building2 size={12} className="text-white" />
              </div>
              <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-zinc-300' : 'text-zinc-700')}>SVCE</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <NavLink to="/student/notifications" className={clsx('relative p-1.5 rounded-xl transition-colors', isDark ? 'text-zinc-400 hover:bg-white/5' : 'text-zinc-500 hover:bg-zinc-100')}>
                  <BellDot size={18} />
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </NavLink>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
