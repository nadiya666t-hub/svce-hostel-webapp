import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Clock, User, LogOut, Menu, X, ClipboardList } from 'lucide-react'
import { useWatchmanAuth } from '@/hooks/useWatchmanAuth'
import { useTheme } from '@/hooks/useTheme'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

const NAV = [
  { to: '/watchman/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/watchman/late-entries', label: 'Late Entries',  icon: Clock },
  { to: '/watchman/instructions', label: 'Instructions',  icon: ClipboardList },
  { to: '/watchman/profile',      label: 'Profile',       icon: User },
]

export default function WatchmanLayout() {
  const { watchman, logout } = useWatchmanAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={clsx('flex flex-col h-full border-r', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200')}>
      <div className={clsx('flex items-center justify-between px-4 py-4 border-b', isDark ? 'border-white/5' : 'border-slate-200')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-white/10 flex items-center justify-center shrink-0">
            <img src="/images/svce-logo.png" alt="SVCE" className="w-full h-full object-contain p-0.5" onError={e => { const i = e.currentTarget; if (!i.src.endsWith('.svg')) i.src = '/svce-logo.svg' }} />
          </div>
          <div>
            <p className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-200' : 'text-slate-800')}>SVCE</p>
            <p className={clsx('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>Watchman Portal</p>
          </div>
        </div>
        {mobile && <button onClick={() => setOpen(false)} className={clsx('p-1.5 rounded-lg', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}><X size={16} /></button>}
      </div>
      <div className={clsx('mx-3 mt-3 p-3 rounded-xl border', isDark ? 'bg-dark-800 border-white/5' : 'bg-slate-50 border-slate-200')}>
        <div className="flex items-center gap-2.5">
          <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold', isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-700')}>{watchman?.name?.charAt(0).toUpperCase() ?? 'W'}</div>
          <div className="min-w-0">
            <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>{watchman?.name ?? 'Watchman'}</p>
            <p className={clsx('text-[10px] truncate font-mono', isDark ? 'text-slate-600' : 'text-slate-400')}>{watchman?.watchmanId}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={mobile ? () => setOpen(false) : undefined}
            className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25' : 'bg-teal-50 text-teal-700 border border-teal-200'
                       : isDark ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}>
            <Icon size={17} className="shrink-0" /><span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={clsx('p-3 border-t space-y-1.5', isDark ? 'border-white/5' : 'border-slate-100')}>
        <div className={clsx('flex items-center justify-between px-3 py-2 rounded-xl', isDark ? 'bg-dark-800' : 'bg-slate-50')}>
          <span className={clsx('text-xs font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>Theme</span>
          <ThemeToggle />
        </div>
        <button onClick={() => { logout(); navigate('/watchman/login', { replace: true }) }}
          className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', isDark ? 'text-slate-500 hover:bg-red-500/10 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600')}>
          <LogOut size={17} className="shrink-0" /><span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className={clsx('min-h-screen flex', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-30"><SidebarContent /></aside>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={clsx('fixed top-0 left-0 h-full w-64 z-50 shadow-2xl transition-transform duration-300 lg:hidden', open ? 'translate-x-0' : '-translate-x-full')}><SidebarContent mobile /></aside>
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className={clsx('lg:hidden sticky top-0 z-20 border-b backdrop-blur-md', isDark ? 'bg-dark-950/90 border-white/5' : 'bg-white/90 border-slate-200')}>
          <div className="px-4 h-14 flex items-center justify-between">
            <button onClick={() => setOpen(true)} className={clsx('p-2 rounded-xl', isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100')}><Menu size={20} /></button>
            <span className={clsx('text-xs font-bold font-mono uppercase tracking-widest', isDark ? 'text-slate-300' : 'text-slate-700')}>SVCE Watchman</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}

