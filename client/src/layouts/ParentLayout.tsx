import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarCheck, CreditCard, LogOut, Menu, X, Phone, History } from 'lucide-react'
import { useParentAuth } from '@/hooks/useParentAuth'
import { useTheme } from '@/hooks/useTheme'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

const NAV = [
  { to: '/parent/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/parent/attendance',  label: 'Attendance',   icon: CalendarCheck },
  { to: '/parent/fees',        label: 'Fees',         icon: CreditCard },
  { to: '/parent/outgoing',    label: 'Outgoing',     icon: History },
  { to: '/parent/contacts',    label: 'Emergency',    icon: Phone },
]

export default function ParentLayout() {
  const { user, logout } = useParentAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const sb = isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200'
  const main = isDark ? 'bg-dark-950' : 'bg-slate-50'
  const hdr = isDark ? 'bg-dark-950/90 border-white/5' : 'bg-white/90 border-slate-200'

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={clsx('flex flex-col h-full p-4 border-r', sb)}>
      <div className="flex items-center gap-3 px-3 mb-6">
        <div className={clsx('w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-white border shrink-0',
          isDark ? 'border-white/10' : 'border-slate-200')}>
          <img src="/images/svce-logo.png" alt="SVCE Bengaluru Logo" className="w-full h-full object-contain p-0.5"
            onError={e => { const i = e.currentTarget; if (!i.src.endsWith('.svg')) i.src = '/images/svce-logo.svg' }} />
        </div>
        <div className="min-w-0">
          <p className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-300' : 'text-slate-700')}>SVCE</p>
          <p className={clsx('text-[10px]', isDark ? 'text-slate-600' : 'text-slate-400')}>Parent Portal</p>
        </div>
        {mobile && (
          <button onClick={() => setOpen(false)} className={clsx('ml-auto p-1 rounded-lg', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* User chip */}
      <div className={clsx('rounded-xl p-3 mb-5 border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center gap-2.5">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs',
            isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')}>
            {user?.name?.charAt(0).toUpperCase() ?? 'P'}
          </div>
          <div className="min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>{user?.name ?? 'Parent'}</p>
            <p className={clsx('text-[10px] truncate font-mono', isDark ? 'text-slate-600' : 'text-slate-400')}>USN: {user?.usn}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={mobile ? () => setOpen(false) : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isDark ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            )}>
            <Icon size={17} className="shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className={clsx('mt-4 pt-4 border-t space-y-2', isDark ? 'border-white/5' : 'border-slate-100')}>
        <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl', isDark ? 'bg-dark-800/50' : 'bg-slate-50')}>
          <span className={clsx('text-xs font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>{isDark ? 'Dark' : 'Light'} Mode</span>
          <ThemeToggle />
        </div>
        <button onClick={() => { logout(); navigate('/', { replace: true }) }}
          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
            isDark ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600')}>
          <LogOut size={17} className="shrink-0" /> Logout
        </button>
      </div>
    </nav>
  )

  return (
    <div className={clsx('min-h-screen flex transition-colors duration-300', main)}>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-30"><SidebarContent /></aside>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in" onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed top-0 left-0 h-full w-64 z-50 shadow-2xl transition-transform duration-300 lg:hidden', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent mobile />
      </aside>
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className={clsx('lg:hidden sticky top-0 z-20 border-b backdrop-blur-md', hdr)}>
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setOpen(true)} className={clsx('p-2 rounded-xl', isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')}><Menu size={20} /></button>
            <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-300' : 'text-slate-700')}>Parent Portal</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
