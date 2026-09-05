import { useState, useEffect } from 'react'
import { Users, Building2, CheckCircle2, XCircle, ClipboardList, AlertTriangle, Loader2, TrendingUp, CalendarCheck } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { Link } from 'react-router-dom'
import { wardenService } from '@/services/wardenService'
import { useWardenAuth } from '@/hooks/useWardenAuth'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface Trend { date: string; label: string; present: number; total: number }
interface Stats {
  totalStudents: number; totalRooms: number; occupiedRooms: number; vacantRooms: number
  pendingRequests: number; pendingProblems: number; presentToday: number; absentToday: number
  attendanceDate: string; trend: Trend[]
}

function StatCard({ label, value, icon: Icon, accent, sub, to }: {
  label: string; value: number | string; icon: React.ElementType; accent: string; sub?: string; to?: string
}) {
  const { isDark } = useTheme()
  const inner = (
    <div className={clsx('relative rounded-2xl border p-5 overflow-hidden transition-all hover:-translate-y-0.5',
      isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm',
      to ? 'cursor-pointer hover:shadow-md' : '')}>
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <p className={clsx('text-3xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-sm font-semibold mt-1', isDark ? 'text-slate-300' : 'text-slate-700')}>{label}</p>
      {sub && <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{sub}</p>}
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function WardenDashboardPage() {
  const { warden } = useWardenAuth()
  const { isDark } = useTheme()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    wardenService.getDashboardStats()
      .then(r => { if (r.success) setStats(r.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-accent-400" /></div>
  )

  const tt = { fontSize: '11px', borderRadius: '8px', border: 'none',
    background: isDark ? '#18191f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }

  const attPct  = stats ? Math.round((stats.presentToday / Math.max(stats.totalStudents, 1)) * 100) : 0
  const attPie  = stats ? [
    { name: 'Present', value: stats.presentToday, color: '#10b981' },
    { name: 'Absent',  value: stats.absentToday,  color: '#ef4444' },
  ] : []
  const roomPie = stats ? [
    { name: 'Occupied', value: stats.occupiedRooms, color: '#3b6ef4' },
    { name: 'Vacant',   value: stats.vacantRooms,   color: '#94a3b8' },
  ] : []

  const cards = stats ? [
    { label: 'Total Students',   value: stats.totalStudents,   icon: Users,          accent: '#3b6ef4', to: '/warden/students' },
    { label: 'Total Rooms',      value: stats.totalRooms,      icon: Building2,      accent: '#6366f1', to: '/warden/rooms' },
    { label: 'Occupied Rooms',   value: stats.occupiedRooms,   icon: Building2,      accent: '#8b5cf6', to: '/warden/rooms' },
    { label: 'Vacant Rooms',     value: stats.vacantRooms,     icon: Building2,      accent: '#10b981', to: '/warden/rooms' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: ClipboardList,  accent: '#f59e0b', to: '/warden/requests' },
    { label: 'Pending Problems', value: stats.pendingProblems, icon: AlertTriangle,  accent: '#f97316', to: '/warden/problems' },
    { label: 'Present Today',    value: stats.presentToday,    icon: CheckCircle2,   accent: '#10b981', to: '/warden/attendance', sub: `${attPct}% attendance` },
    { label: 'Absent Today',     value: stats.absentToday,     icon: XCircle,        accent: '#ef4444', to: '/warden/attendance' },
  ] : []

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
          Welcome, {warden?.name ?? 'Warden'} 👋
        </h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
          SVCE Girls Hostel · {warden?.designation} · {stats?.attendanceDate}
        </p>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Charts row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Attendance pie */}
          <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
              <CalendarCheck size={12} /> Today's Attendance
            </p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={attPie} cx="50%" cy="50%" innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                    {attPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tt} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {attPie.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>{d.name}</span>
                    <span className={clsx('text-xs font-bold ml-auto', isDark ? 'text-slate-200' : 'text-slate-800')}>{d.value}</span>
                  </div>
                ))}
                <p className={clsx('text-xs font-bold pt-1 border-t', isDark ? 'border-white/5 text-accent-400' : 'border-slate-100 text-accent-600')}>{attPct}%</p>
              </div>
            </div>
          </div>

          {/* Room occupancy */}
          <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-400' : 'text-slate-500')}>Room Occupancy</p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={roomPie} cx="50%" cy="50%" innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                    {roomPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tt} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {roomPie.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>{d.name}</span>
                    <span className={clsx('text-xs font-bold ml-auto', isDark ? 'text-slate-200' : 'text-slate-800')}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending issues */}
          <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-400' : 'text-slate-500')}>Pending Issues</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={[
                { name: 'Requests', value: stats.pendingRequests },
                { name: 'Problems', value: stats.pendingProblems },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {[{ color: '#f59e0b' }, { color: '#f97316' }].map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 7-day attendance trend */}
      {stats?.trend && stats.trend.length > 0 && (
        <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
          <p className={clsx('text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2', isDark ? 'text-slate-400' : 'text-slate-500')}>
            <TrendingUp size={12} /> 7-Day Attendance Trend
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={tt} formatter={(v: number, n: string) => [v, n === 'present' ? 'Present' : 'Total']} />
              <Line type="monotone" dataKey="total" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={2} dot={false} name="total" />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} name="present" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
