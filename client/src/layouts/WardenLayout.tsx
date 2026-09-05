import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, ClipboardList, AlertTriangle,
  CalendarCheck, ShieldCheck, Megaphone, Phone, User, LogOut, Menu, X,
  Bell, CreditCard, Clock,
} from 'lucide-react'
import { useWardenAuth } from '@/hooks/useWardenAuth'
import { useTheme } from '@/hooks/useTheme'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

const NAV = [
  { to: '/warden/dashboard',          label: 'Dashboard',            icon: LayoutDashboard },
  { to: '/warden/students',           label: 'Students',             icon: Users },
  { to: '/warden/rooms',              label: 'Rooms',                icon: Building2 },
  { to: '/warden/requests',           label: 'Requests',             icon: ClipboardList },
  { to: '/warden/problems',           label: 'Problems',             icon: AlertTriangle },
  { to: '/warden/attendance',         label: 'Attendance',           icon: CalendarCheck },
  { to: '/warden/windows',            label: 'Att. Windows',         icon: Clock },
  { to: '/warden/special-access',     label: 'Special Attendance',   icon: ShieldCheck },
  { to: '/warden/fees',               label: 'Fees',                 icon: CreditCard },
  { to: '/warden/notices',            label: 'Notices',              icon: Bell },
  { to: '/warden/announcements',      label: 'Announcements',        icon: Megaphone },
  { to: '/warden/emergency-contacts', label: 'Emergency Contacts',   icon: Phone },
  { to: '/warden/profile',            label: 'Profile',              icon: User },
]

function SidebarContent({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { warden, logout } = useWardenAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()

  return (
    <div className={clsx(
      'flex flex-col h-full border-r',
      isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-white/10 flex items-center justify-center shrink-0">
            <img src="/images/svce-logo.png" alt="SVCE" className="w-full h-full object-contain p-0.5"
              onError={e => { const i = e.currentTarget; if (!i.src.endsWith('.svg')) i.src = '/svce-logo.svg' }} />
          </div>
          <div>
            <p className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-200' : 'text-slate-800')}>SVCE</p>
            <p className={clsx('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>Warden Portal</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Warden info */}
      <div className={clsx('mx-3 mt-3 p-3 rounded-xl border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center gap-2.5">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
            isDark ? 'bg-accent-600/20 text-accent-400' : 'bg-accent-100 text-accent-700')}>
            {warden?.name?.charAt(0).toUpperCase() ?? 'W'}
          </div>
          <div className="min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>{warden?.name ?? 'Warden'}</p>
            <p className={clsx('text-[10px] truncate font-mono', isDark ? 'text-slate-600' : 'text-slate-400')}>{warden?.wardenId}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={mobile ? onClose : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? isDark
                  ? 'bg-accent-600/15 text-accent-300 border border-accent-600/25'
                  : 'bg-accent-50 text-accent-700 border border-accent-200'
                : isDark
                  ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            )}>
            <Icon size={17} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className={clsx('p-3 border-t space-y-1.5', isDark ? 'border-white/5' : 'border-slate-100')}>
        <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl', isDark ? 'bg-dark-800' : 'bg-slate-50')}>
          <span className={clsx('text-xs font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>Theme</span>
          <ThemeToggle />
        </div>
        <button onClick={() => { logout(); navigate('/warden/login', { replace: true }) }}
          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isDark ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600')}>
          <LogOut size={17} className="shrink-0" /> Logout
        </button>
      </div>
    </div>
  )
}

export default function WardenLayout() {
  const { isDark } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className={clsx('min-h-screen flex transition-colors duration-300', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      {/* Mobile sidebar */}
      <aside className={clsx('fixed top-0 left-0 h-full w-64 z-50 shadow-2xl transition-transform duration-300 lg:hidden', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent mobile onClose={() => setOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className={clsx('lg:hidden sticky top-0 z-20 border-b backdrop-blur-md', isDark ? 'bg-dark-950/90 border-white/5' : 'bg-white/90 border-slate-200')}>
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setOpen(true)} className={clsx('p-2 rounded-xl', isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')}>
              <Menu size={20} />
            </button>
            <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-300' : 'text-slate-700')}>Warden Portal</span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
