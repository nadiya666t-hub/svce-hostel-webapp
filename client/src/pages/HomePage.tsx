import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, Users, Shield, Eye, Watch, Settings,
  ArrowRight, Clock, X, ChevronRight, Home,
  MapPin, Building,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

// ─── Portal data ──────────────────────────────────────────────────────────────

type Portal = {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  active: boolean
  path?: string
  accentColor: string
}

const portals: Portal[] = [
  {
    id: 'student',
    title: 'Student',
    subtitle: 'Access your hostel',
    description: 'Attendance, fees, requests, notices and more.',
    icon: GraduationCap,
    active: true,
    path: '/student/login',
    accentColor: '#3b6ef4',
  },
  {
    id: 'parent',
    title: 'Parent',
    subtitle: 'Family access',
    description: "Monitor your child's hostel status and attendance.",
    icon: Users,
    active: false,
    accentColor: '#10b981',
  },
  {
    id: 'warden',
    title: 'Warden',
    subtitle: 'Floor management',
    description: 'Manage students, attendance windows, and issues.',
    icon: Shield,
    active: false,
    accentColor: '#f59e0b',
  },
  {
    id: 'overseer',
    title: 'Overseer',
    subtitle: 'Operations',
    description: 'Oversee hostel operations and administration.',
    icon: Eye,
    active: false,
    accentColor: '#8b5cf6',
  },
  {
    id: 'watchman',
    title: 'Watchman',
    subtitle: 'Gate management',
    description: 'Record student entry and exit at the hostel gate.',
    icon: Watch,
    active: false,
    accentColor: '#ec4899',
  },
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'System control',
    description: 'Full system administration, users and settings.',
    icon: Settings,
    active: false,
    accentColor: '#06b6d4',
  },
]

// ─── Coming Soon Modal ────────────────────────────────────────────────────────

function ComingSoonModal({ portal, onClose }: { portal: Portal; onClose: () => void }) {
  const Icon = portal.icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div
        className={clsx(
          'relative rounded-2xl p-8 max-w-sm w-full text-center animate-scale-in border',
          'dark:bg-dark-800 dark:border-white/10 bg-white border-zinc-200 shadow-2xl'
        )}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg dark:text-zinc-400 dark:hover:bg-white/10 text-zinc-500 hover:bg-zinc-100 transition-colors"
        >
          <X size={16} />
        </button>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: `${portal.accentColor}18`, border: `1px solid ${portal.accentColor}30` }}
        >
          <Icon size={28} style={{ color: portal.accentColor }} />
        </div>
        <h2 className="text-xl font-bold font-display dark:text-white text-zinc-900 mb-1">{portal.title} Portal</h2>
        <p className="text-sm dark:text-zinc-400 text-zinc-500 mb-6">{portal.subtitle}</p>
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl px-4 py-2.5 mb-4">
          <Clock size={14} />
          <span className="text-sm font-semibold">Coming Soon</span>
        </div>
        <p className="text-xs dark:text-zinc-500 text-zinc-400 leading-relaxed">
          The <strong className="dark:text-zinc-300 text-zinc-700">{portal.title} Portal</strong> is under development and will be available soon.
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Portal Card ──────────────────────────────────────────────────────────────

function PortalCard({ portal, index, onClick }: { portal: Portal; index: number; onClick: () => void }) {
  const Icon = portal.icon
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group relative w-full text-left rounded-2xl p-5 border transition-all duration-300 cursor-pointer',
        'animate-slide-up overflow-hidden',
        portal.active
          ? 'dark:bg-dark-800 dark:border-accent-600/40 dark:hover:border-accent-500 bg-white border-blue-200 hover:border-blue-400 shadow-glow-sm hover:shadow-glow'
          : 'dark:bg-dark-900 dark:border-white/5 dark:hover:border-white/10 bg-zinc-50 border-zinc-200 hover:border-zinc-300'
      )}
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'both' }}
    >
      {/* Active indicator line */}
      {portal.active && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${portal.accentColor}, transparent)` }}
        />
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${portal.accentColor}18`, border: `1px solid ${portal.accentColor}25` }}
      >
        <Icon size={18} style={{ color: portal.accentColor }} />
      </div>

      {/* Text */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-base font-bold font-display dark:text-white text-zinc-900">{portal.title}</h3>
          {portal.active ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 border border-accent-500/20 uppercase tracking-wide">
              Live
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full dark:bg-white/5 dark:text-zinc-500 bg-zinc-100 text-zinc-400 border dark:border-white/5 border-zinc-200 uppercase tracking-wide">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs dark:text-zinc-500 text-zinc-400 mb-2">{portal.subtitle}</p>
        <p className="text-xs dark:text-zinc-400 text-zinc-500 leading-relaxed">{portal.description}</p>
      </div>

      {/* CTA */}
      <div className={clsx(
        'flex items-center gap-1 text-xs font-semibold transition-all duration-200',
        portal.active
          ? 'text-accent-400 group-hover:gap-2'
          : 'dark:text-zinc-600 text-zinc-400'
      )}>
        {portal.active ? (
          <><span>Enter Portal</span><ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></>
        ) : 'Coming Soon'}
      </div>
    </button>
  )
}

// ─── Animated background grid ────────────────────────────────────────────────

function BackgroundGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 dark:bg-grid-dark bg-grid-light opacity-100" />
      {/* Radial gradient center glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full dark:opacity-30 opacity-20"
        style={{ background: 'radial-gradient(ellipse, rgba(59,110,244,0.4) 0%, transparent 70%)' }} />
      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-px h-48 dark:bg-gradient-to-b dark:from-accent-500/40 dark:to-transparent bg-gradient-to-b from-blue-400/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-48 h-px dark:bg-gradient-to-r dark:from-accent-500/40 dark:to-transparent bg-gradient-to-r from-blue-400/20 to-transparent" />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = 'home' | 'portals'

export default function HomePage() {
  const navigate = useNavigate()
  const [modalPortal, setModalPortal] = useState<Portal | null>(null)
  const [view, setView] = useState<View>('home')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
  const dateStr = time.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  function handlePortalClick(portal: Portal) {
    if (portal.active && portal.path) navigate(portal.path)
    else setModalPortal(portal)
  }

  return (
    <div className="min-h-screen dark:bg-dark-950 bg-zinc-50 relative transition-colors duration-300">
      <BackgroundGrid />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 h-14 dark:border-white/5 border-zinc-200 border-b dark:bg-dark-950/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
            <Building size={14} className="text-white" />
          </div>
          <span className="text-xs font-bold font-mono dark:text-zinc-400 text-zinc-500 uppercase tracking-widest">SVCE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-xs font-mono dark:text-zinc-600 text-zinc-400">{timeStr}</span>
          <ThemeToggle />
        </div>
      </header>

      {/* ── HOME VIEW ── */}
      {view === 'home' && (
        <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 py-12">
          {/* Institution badge */}
          <div className="flex items-center gap-2 dark:bg-white/5 bg-zinc-100 border dark:border-white/8 border-zinc-200 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <MapPin size={12} className="dark:text-accent-400 text-accent-600" />
            <span className="text-xs dark:text-zinc-400 text-zinc-500 font-medium">SVCE Girls Hostel · Est. 2025</span>
          </div>

          {/* College logo + name — side by side, prominent */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mb-12 animate-slide-up text-center sm:text-left"
            style={{ animationDelay: '100ms', animationFillMode: 'both' }}>

            {/* Logo */}
            <div className="shrink-0 relative">
              {/* Glow ring behind logo */}
              <div className="absolute inset-0 rounded-full blur-2xl opacity-30 dark:opacity-40"
                style={{ background: 'radial-gradient(circle, rgba(59,110,244,0.6) 0%, transparent 70%)', transform: 'scale(1.3)' }} />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden flex items-center justify-center
                dark:bg-white bg-white border-2 dark:border-white/20 border-zinc-300 p-1.5 shadow-[0_0_24px_rgba(59,110,244,0.25)]
                transition-transform duration-300 hover:scale-105">
                <img
                  src="/svce-logo.png"
                  alt="SVCE Logo"
                  className="w-full h-full object-contain"
                  onError={e => {
                    // Fallback to SVG if PNG not found
                    const img = e.target as HTMLImageElement
                    if (!img.src.includes('svce-logo.svg')) img.src = '/svce-logo.svg'
                  }}
                />
              </div>
            </div>

            {/* College name */}
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-[0.4em] dark:text-accent-400 text-accent-600 mb-3">
                Vidyanagar Cross, Bangalore · Est. 2001
              </p>
              <h1 className="font-display font-bold dark:text-white text-zinc-900 leading-tight mb-3"
                style={{ fontSize: 'clamp(1.5rem, 4.5vw, 3rem)' }}>
                Sri Venkateshwara<br />
                <span className="text-gradient-accent">College of Engineering</span>
              </h1>
              <p className="text-sm dark:text-zinc-500 text-zinc-400 max-w-sm leading-relaxed">
                Smart hostel management system for students, staff and administration.
              </p>
            </div>
          </div>

          {/* Live clock */}
          <div
            className="dark:bg-dark-800/60 bg-white/80 backdrop-blur-sm border dark:border-white/8 border-zinc-200 rounded-2xl px-6 py-4 mb-10 text-center animate-slide-up"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <p className="font-mono text-2xl font-bold dark:text-white text-zinc-900 tabular-nums">{timeStr}</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-1">{dateStr}</p>
          </div>

          {/* Girls Hostel CTA */}
          <button
            onClick={() => setView('portals')}
            className="group relative animate-slide-up"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
            <div className="relative overflow-hidden rounded-2xl px-10 py-5 transition-all duration-300 group-hover:-translate-y-1"
              style={{
                background: 'linear-gradient(135deg, #3b6ef4 0%, #2240cc 50%, #1d3283 100%)',
                boxShadow: '0 0 32px rgba(59,110,244,0.4), 0 4px 24px rgba(0,0,0,0.3)',
              }}>
              {/* Shine sweep */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)', backgroundSize: '200% 100%' }} />
              <div className="relative flex items-center gap-4">
                <Home size={24} className="text-white/80" />
                <div className="text-left">
                  <p className="font-display text-xl font-bold text-white tracking-tight">Girls Hostel</p>
                  <p className="text-xs text-white/60 mt-0.5">Select your portal to continue</p>
                </div>
                <ChevronRight size={20} className="text-white/60 ml-2 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>

          <p className="mt-6 text-xs dark:text-zinc-700 text-zinc-400 animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
            Management System v2.0
          </p>
        </main>
      )}

      {/* ── PORTALS VIEW ── */}
      {view === 'portals' && (
        <main className="relative z-10 max-w-4xl mx-auto px-4 py-10">
          {/* Back */}
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-xs dark:text-zinc-500 text-zinc-400 hover:dark:text-zinc-300 hover:text-zinc-600 mb-8 transition-colors group"
          >
            <ArrowRight size={13} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <div className="mb-8 animate-fade-in">
            <p className="text-xs font-mono uppercase tracking-[0.3em] dark:text-accent-400 text-accent-600 mb-2">Select Portal</p>
            <h2 className="font-display text-3xl font-bold dark:text-white text-zinc-900">
              Girls Hostel
            </h2>
            <p className="text-sm dark:text-zinc-500 text-zinc-400 mt-1">Sri Venkateshwara College of Engineering</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portals.map((p, i) => (
              <PortalCard key={p.id} portal={p} index={i} onClick={() => handlePortalClick(p)} />
            ))}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 border-t dark:border-white/5 border-zinc-200">
        <p className="text-xs dark:text-zinc-700 text-zinc-400 font-mono">
        SVCE Girls Hostel · Vidyanagar Cross, Bangalore · {new Date().getFullYear()}
        </p>
      </footer>

      {modalPortal && <ComingSoonModal portal={modalPortal} onClose={() => setModalPortal(null)} />}
    </div>
  )
}
