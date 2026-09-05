import { useEffect, useState } from 'react'
import { Users, CalendarCheck, AlertTriangle, Bell, TrendingUp, Building2, Loader2, BanknoteIcon } from 'lucide-react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface Stats {
  totalStudents: number; activeStudents: number; totalRooms: number; totalFloors: number
  todayPresent: number; attendancePct: number
  pendingRequests: number; openProblems: number; pendingFees: number
  recentNotices: Array<{ id: string; title: string; priority: string; createdAt: string }>
}

const PRIORITY_COLOR: Record<string,string> = {
  LOW: 'text-slate-400', MEDIUM: 'text-blue-400', HIGH: 'text-amber-400', URGENT: 'text-red-400',
}

function StatCard({ label, value, sub, accent, icon: Icon }: { label:string; value:number|string; sub?:string; accent:string; icon:React.ElementType }) {
  const { isDark } = useTheme()
  return (
    <div className={clsx('relative rounded-2xl border p-5 overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background:`${accent}20`, border:`1px solid ${accent}30` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className={clsx('text-3xl font-bold font-display', isDark?'text-white':'text-slate-900')}>{value}</p>
      <p className={clsx('text-sm font-semibold mt-1', isDark?'text-slate-300':'text-slate-700')}>{label}</p>
      {sub && <p className={clsx('text-xs mt-0.5', isDark?'text-slate-500':'text-slate-400')}>{sub}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth()
  const { isDark } = useTheme()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard/stats')
      .then(r => { if (r.data.success) setStats(r.data.data) })
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-violet-400" /></div>

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>
          {greeting}, {admin?.name ?? 'Admin'} 👋
        </h1>
        <p className={clsx('text-sm mt-0.5', isDark?'text-slate-400':'text-slate-500')}>SVCE Girls Hostel · Admin Overview</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Total Students"   value={stats.totalStudents}   sub={`${stats.activeStudents} active`} accent="#8b5cf6" icon={Users} />
            <StatCard label="Today Present"    value={stats.todayPresent}    sub={`${stats.attendancePct}% attendance`} accent="#10b981" icon={CalendarCheck} />
            <StatCard label="Pending Requests" value={stats.pendingRequests} accent="#f59e0b" icon={TrendingUp} />
            <StatCard label="Open Problems"    value={stats.openProblems}    accent="#ef4444" icon={AlertTriangle} />
            <StatCard label="Pending Fees"     value={stats.pendingFees}     accent="#f97316" icon={BanknoteIcon} />
            <StatCard label="Total Rooms"      value={stats.totalRooms}      sub={`${stats.totalFloors} floors`} accent="#6366f1" icon={Building2} />
          </div>

          {stats.recentNotices.length > 0 && (
            <div className={clsx('rounded-2xl border p-5', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
              <h2 className={clsx('text-sm font-bold uppercase tracking-widest mb-4', isDark?'text-slate-400':'text-slate-500')}>Recent Notices</h2>
              <div className="space-y-2">
                {stats.recentNotices.map(n => (
                  <div key={n.id} className={clsx('flex items-center justify-between p-3 rounded-xl border', isDark?'bg-dark-800 border-white/5':'bg-slate-50 border-slate-100')}>
                    <div className="flex items-center gap-3">
                      <Bell size={14} className={isDark?'text-slate-500':'text-slate-400'} />
                      <p className={clsx('text-sm font-medium', isDark?'text-slate-200':'text-slate-800')}>{n.title}</p>
                    </div>
                    <span className={clsx('text-xs font-semibold', PRIORITY_COLOR[n.priority] ?? 'text-slate-400')}>{n.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
