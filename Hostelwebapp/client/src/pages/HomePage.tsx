import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  Users,
  Shield,
  Eye,
  Watch,
  Settings,
  ArrowRight,
  Building2,
  Sparkles,
  X,
  Clock,
} from 'lucide-react'
import clsx from 'clsx'

// ─── Portal Card Data ─────────────────────────────────────────────────────────

type Portal = {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  gradient: string
  iconBg: string
  iconColor: string
  active: boolean
  path?: string
}

const portals: Portal[] = [
  {
    id: 'student',
    title: 'Student',
    subtitle: 'My Hostel',
    description: 'Track attendance, manage fees, raise requests and stay connected.',
    icon: GraduationCap,
    gradient: 'from-violet-500/10 via-primary-500/10 to-blue-500/10',
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    active: true,
    path: '/student/login',
  },
  {
    id: 'parent',
    title: 'Parent',
    subtitle: 'Family Access',
    description: "Monitor your child's hostel stay, attendance and fee status.",
    icon: Users,
    gradient: 'from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    active: false,
  },
  {
    id: 'warden',
    title: 'Warden',
    subtitle: 'Floor Management',
    description: 'Manage students, attendance windows, and resolve issues.',
    icon: Shield,
    gradient: 'from-amber-500/10 via-orange-500/10 to-red-500/10',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    active: false,
  },
  {
    id: 'overseer',
    title: 'Overseer',
    subtitle: 'Operations',
    description: 'Oversee hostel operations, wardens and overall administration.',
    icon: Eye,
    gradient: 'from-rose-500/10 via-pink-500/10 to-fuchsia-500/10',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    active: false,
  },
  {
    id: 'watchman',
    title: 'Watchman',
    subtitle: 'Entry & Exit',
    description: 'Record student entry and exit at the hostel gate.',
    icon: Watch,
    gradient: 'from-slate-500/10 via-zinc-500/10 to-gray-500/10',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    active: false,
  },
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'System Control',
    description: 'Full system administration: users, settings, reports.',
    icon: Settings,
    gradient: 'from-indigo-500/10 via-blue-500/10 to-sky-500/10',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    active: false,
  },
]

// ─── Coming Soon Modal ────────────────────────────────────────────────────────

function ComingSoonModal({
  portal,
  onClose,
}: {
  portal: Portal
  onClose: () => void
}) {
  const Icon = portal.icon
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          className={clsx(
            'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5',
            portal.iconBg
          )}
        >
          <Icon size={28} className={portal.iconColor} />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">{portal.title} Portal</h2>
        <p className="text-sm text-slate-500 mb-6">{portal.subtitle}</p>

        <div className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 rounded-xl px-4 py-3 mb-4">
          <Clock size={16} className="shrink-0" />
          <span className="text-sm font-semibold">Coming Soon</span>
        </div>

        <p className="text-sm text-slate-500 leading-relaxed">
          The <span className="font-semibold text-slate-700">{portal.title} Portal</span> is
          currently under development and will be available soon.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ─── Portal Card ──────────────────────────────────────────────────────────────

function PortalCard({
  portal,
  index,
  onClick,
}: {
  portal: Portal
  index: number
  onClick: (portal: Portal) => void
}) {
  const Icon = portal.icon

  return (
    <div
      onClick={() => onClick(portal)}
      className={clsx(
        'relative group cursor-pointer rounded-2xl p-6 border transition-all duration-300',
        'animate-slide-up',
        portal.active
          ? [
              'bg-white border-primary-200 shadow-card hover:shadow-card-hover hover:-translate-y-1',
              'ring-1 ring-primary-100',
            ]
          : [
              'bg-white/80 border-slate-200/80 shadow-card hover:shadow-card-hover hover:-translate-y-1',
            ]
      )}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      {/* Gradient background */}
      <div
        className={clsx(
          'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          portal.gradient
        )}
      />

      {/* Active badge */}
      {portal.active && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-glow-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          Active
        </span>
      )}

      {/* Coming Soon badge */}
      {!portal.active && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200">
          <Clock size={10} />
          Soon
        </span>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
            portal.iconBg
          )}
        >
          <Icon size={22} className={portal.iconColor} />
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-0.5">{portal.title}</h3>
        <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">
          {portal.subtitle}
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">{portal.description}</p>

        <div
          className={clsx(
            'mt-5 flex items-center gap-1 text-sm font-semibold transition-all duration-200',
            portal.active
              ? 'text-primary-600 group-hover:gap-2'
              : 'text-slate-400'
          )}
        >
          {portal.active ? (
            <>
              Enter Portal <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            'Coming Soon'
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const [modalPortal, setModalPortal] = useState<Portal | null>(null)

  const handlePortalClick = (portal: Portal) => {
    if (portal.active && portal.path) {
      navigate(portal.path)
    } else {
      setModalPortal(portal)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-glow-sm">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800 tracking-tight">HMS</span>
              <span className="hidden sm:inline text-base font-normal text-slate-400 ml-1">
                · Hostel Management
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={14} className="text-primary-500" />
            <span className="hidden sm:inline font-medium">Smart living, simplified.</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center animate-fade-in">
        {/* Pill */}
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <Sparkles size={12} />
          Smart Hostel Management
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Hostel{' '}
          <span className="text-gradient">Management</span>
          <br />
          System
        </h1>

        <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          One platform for students, parents, wardens, and staff. Everything you need to manage
          hostel life — in one place.
        </p>

        {/* Stats row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { label: 'Students', value: '500+' },
            { label: 'Rooms', value: '120+' },
            { label: 'Floors', value: '4' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Portal Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-slate-700">Select Your Portal</h2>
          <p className="text-sm text-slate-400 mt-1">Choose the portal that matches your role</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {portals.map((portal, i) => (
            <PortalCard
              key={portal.id}
              portal={portal}
              index={i}
              onClick={handlePortalClick}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center">
              <Building2 size={10} className="text-white" />
            </div>
            <span className="font-medium text-slate-500">Hostel Management System</span>
          </div>
          <span>© {new Date().getFullYear()} · All rights reserved</span>
        </div>
      </footer>

      {/* Coming Soon Modal */}
      {modalPortal && (
        <ComingSoonModal portal={modalPortal} onClose={() => setModalPortal(null)} />
      )}
    </div>
  )
}
