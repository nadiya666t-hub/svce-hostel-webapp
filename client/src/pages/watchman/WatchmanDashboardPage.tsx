import { useEffect, useState } from 'react'
import { Users, Clock, CheckCircle2, XCircle, Eye, UserCheck, Loader2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWatchmanAuth } from '@/hooks/useWatchmanAuth'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

function StatCard({ label, value, accent, icon: Icon }: { label: string; value: number; accent: string; icon: React.ElementType }) {
  const { isDark } = useTheme()
  return (
    <div className={clsx('relative rounded-2xl border p-5 overflow-hidden', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className={clsx('text-3xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-sm font-semibold mt-1', isDark ? 'text-slate-300' : 'text-slate-700')}>{label}</p>
    </div>
  )
}

export default function WatchmanDashboardPage() {
  const { watchman } = useWatchmanAuth()
  const { isDark } = useTheme()
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/watchman/dashboard/stats').then(r => { if (r.data.success) setStats(r.data.data) }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-teal-400" /></div>

  const cards = stats ? [
    { label: "Today's Entries",   value: stats.totalToday,    accent: '#3b6ef4', icon: Users },
    { label: 'Late Entries',      value: stats.lateToday,     accent: '#f97316', icon: Clock },
    { label: 'Visitors Today',    value: stats.visitorsToday, accent: '#8b5cf6', icon: Eye },
    { label: 'Pending Approval',  value: stats.pendingPerms,  accent: '#f59e0b', icon: Clock },
    { label: 'Currently Inside',  value: stats.insideNow,     accent: '#14b8a6', icon: UserCheck },
    { label: 'Approved Today',    value: stats.approvedToday, accent: '#10b981', icon: CheckCircle2 },
    { label: 'Rejected Today',    value: stats.rejectedToday, accent: '#ef4444', icon: XCircle },
  ] : []

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Welcome, {watchman?.name ?? 'Watchman'} 👋</h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>SVCE Girls Hostel · Gate Management</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { to: '/watchman/visitors',     label: 'Manage Visitors',   sub: 'Record entry, check permissions, mark exit', icon: Users,    accent: '#8b5cf6' },
          { to: '/watchman/late-entries', label: 'Late Entry Records', sub: 'Record late student arrivals',              icon: Clock,    accent: '#f97316' },
        ].map(({ to, label, sub, icon: Icon, accent }) => (
          <Link key={to} to={to}
            className={clsx('group flex items-center gap-4 p-5 rounded-2xl border transition-all hover:-translate-y-0.5', isDark ? 'bg-dark-900 border-white/8 hover:border-white/15' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
              <Icon size={22} style={{ color: accent }} />
            </div>
            <div className="flex-1">
              <p className={clsx('text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{label}</p>
              <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{sub}</p>
            </div>
            <ArrowRight size={16} className={clsx('transition-transform group-hover:translate-x-1', isDark ? 'text-slate-600' : 'text-slate-300')} />
          </Link>
        ))}
      </div>
    </div>
  )
}
