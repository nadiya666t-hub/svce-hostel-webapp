import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2, ArrowRight, AlertOctagon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOverseerAuth } from '@/hooks/useOverseerAuth'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  NEW:          { label: 'New',         color: 'text-blue-400',    dot: 'bg-blue-500'    },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-amber-400',   dot: 'bg-amber-500'   },
  IN_PROGRESS:  { label: 'In Progress', color: 'text-violet-400',  dot: 'bg-violet-500'  },
  RESOLVED:     { label: 'Resolved',    color: 'text-emerald-400', dot: 'bg-emerald-500' },
  REJECTED:     { label: 'Rejected',    color: 'text-red-400',     dot: 'bg-red-500'     },
  ESCALATED:    { label: 'Escalated',   color: 'text-rose-400',    dot: 'bg-rose-500'    },
}

function StatCard({ label, value, accent, icon: Icon, sub }: { label: string; value: number; accent: string; icon: React.ElementType; sub?: string }) {
  const { isDark } = useTheme()
  return (
    <div className={clsx('relative rounded-2xl border p-5 overflow-hidden', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className={clsx('text-3xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-sm font-semibold mt-1', isDark ? 'text-slate-300' : 'text-slate-700')}>{label}</p>
      {sub && <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{sub}</p>}
    </div>
  )
}

export default function OverseerDashboardPage() {
  const { overseer } = useOverseerAuth()
  const { isDark } = useTheme()
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/overseer/dashboard/stats').then(r => { if (r.data.success) setStats(r.data.data) }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-orange-400" /></div>

  const cards = stats ? [
    { label: 'Total Problems',  value: stats.total as number,      accent: '#6366f1', icon: AlertTriangle },
    { label: 'New',             value: stats.new as number,        accent: '#3b82f6', icon: AlertTriangle },
    { label: 'In Progress',     value: stats.inProgress as number, accent: '#8b5cf6', icon: TrendingUp },
    { label: 'Resolved',        value: stats.resolved as number,   accent: '#10b981', icon: CheckCircle2 },
    { label: 'Escalated',       value: stats.escalated as number,  accent: '#ef4444', icon: AlertOctagon },
    { label: 'Overdue',         value: stats.overdue as number,    accent: '#f97316', icon: Clock, sub: 'No action in 48h' },
  ] : []

  const recent = (stats?.recent ?? []) as Array<Record<string, unknown>>

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Welcome, {overseer?.name ?? 'Overseer'} 👋</h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>SVCE Girls Hostel · Problem Management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Recent problems */}
      <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-sm font-bold uppercase tracking-widest', isDark ? 'text-slate-400' : 'text-slate-500')}>Recent Problems</h2>
          <Link to="/overseer/problems" className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 font-medium">View all <ArrowRight size={12} /></Link>
        </div>
        {recent.length === 0 ? (
          <p className={clsx('text-xs text-center py-8', isDark ? 'text-slate-600' : 'text-slate-400')}>No problems yet</p>
        ) : (
          <div className="space-y-2">
            {recent.map((p: Record<string, unknown>) => {
              const meta = STATUS_META[p.status as string] ?? STATUS_META.NEW
              const isOverdue = p.isOverdue as boolean
              return (
                <Link key={p.id as string} to={`/overseer/problems/${p.id}`}
                  className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all hover:-translate-y-0.5', isDark ? 'bg-dark-800 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-100 hover:border-slate-200')}>
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                      {(p.studentName as string)} — {(p.category as string).replace(/_/g,' ')}
                    </p>
                    <p className={clsx('text-[10px] mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>Room {p.roomNumber as string} · {p.floor as string}</p>
                  </div>
                  {isOverdue && <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">OVERDUE</span>}
                  <span className={clsx('text-xs font-semibold', meta.color)}>{meta.label}</span>
                  <ArrowRight size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
