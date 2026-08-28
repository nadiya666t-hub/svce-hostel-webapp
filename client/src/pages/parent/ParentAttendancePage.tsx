import { useState, useEffect } from 'react'
import { CalendarCheck, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { parentService, type ParentAttendanceRecord } from '@/services/parentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string, { label: string; color: string; dot: string; hex: string }> = {
  PRESENT:       { label: 'Present',       color: 'text-emerald-600', dot: 'bg-emerald-500', hex: '#10b981' },
  LATE_PRESENT:  { label: 'Late Present',  color: 'text-amber-500',   dot: 'bg-amber-500',   hex: '#f59e0b' },
  ABSENT:        { label: 'Absent',        color: 'text-red-500',     dot: 'bg-red-500',     hex: '#ef4444' },
  NOT_SUBMITTED: { label: 'Not Submitted', color: 'text-slate-400',   dot: 'bg-slate-400',   hex: '#94a3b8' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function ParentAttendancePage() {
  const { isDark } = useTheme()
  const [records, setRecords] = useState<ParentAttendanceRecord[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [more, setMore]       = useState(false)

  async function load(p: number) {
    setLoading(true)
    try {
      const res = await parentService.getAttendanceHistory(p, 30)
      if (res.success && res.data) {
        setRecords(prev => p === 1 ? res.data!.records : [...prev, ...res.data!.records])
        setTotal(res.data.total)
        setMore(p < res.data.totalPages)
        setPage(p)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load(1) }, [])

  const present      = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length
  const absent       = records.filter(r => r.status === 'ABSENT').length
  const notSubmitted = records.filter(r => r.status === 'NOT_SUBMITTED').length
  const pct          = records.length ? Math.round((present / records.length) * 100) : 0

  const pieData = [
    { name: 'Present',       value: present,      color: '#10b981' },
    { name: 'Absent',        value: absent,       color: '#ef4444' },
    { name: 'Not Submitted', value: notSubmitted, color: '#94a3b8' },
  ].filter(d => d.value > 0)

  const barData = records.slice(0, 14).reverse().map(r => ({
    date: fmtDate(r.date),
    present: (r.status === 'PRESENT' || r.status === 'LATE_PRESENT') ? 1 : 0,
    absent:  r.status === 'ABSENT' ? 1 : 0,
    missed:  r.status === 'NOT_SUBMITTED' ? 1 : 0,
  }))

  const card = clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')
  const ttStyle = { fontSize: '11px', borderRadius: '8px', border: 'none', background: isDark ? '#18191f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-5">

      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200')}>
          <CalendarCheck size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Attendance</h1>
          <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Daily hostel attendance records</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: 'Present',  v: present,      c: 'text-emerald-500' },
          { l: 'Absent',   v: absent,       c: 'text-red-500' },
          { l: 'Missed',   v: notSubmitted, c: isDark ? 'text-slate-400' : 'text-slate-500' },
          { l: 'Rate',     v: `${pct}%`,    c: pct >= 75 ? 'text-emerald-500' : 'text-amber-500' },
        ].map(({ l, v, c }) => (
          <div key={l} className={clsx('rounded-2xl border p-3 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xl font-bold', c)}>{v}</p>
            <p className={clsx('text-[10px] font-semibold mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{l}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Donut chart */}
          <div className={card}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>Attendance Summary</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className={clsx('text-xs', isDark ? 'text-slate-300' : 'text-slate-600')}>{d.name}</span>
                    <span className={clsx('text-xs font-bold ml-auto', isDark ? 'text-slate-200' : 'text-slate-800')}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart — last 14 days */}
          <div className={card}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>Last 14 Days</p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={barData} barSize={6} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? '#64748b' : '#94a3b8' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis hide />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="present" stackId="a" fill="#10b981" radius={[2,2,0,0]} name="Present" />
                <Bar dataKey="absent"  stackId="a" fill="#ef4444" name="Absent" />
                <Bar dataKey="missed"  stackId="a" fill="#94a3b8" name="Missed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Records list */}
      {loading && records.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-emerald-400" /></div>
      ) : records.length === 0 ? (
        <div className={clsx('rounded-2xl border p-10 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
          <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>No attendance records yet.</p>
        </div>
      ) : (
        <div className={card}>
          <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>History</p>
          <div className="space-y-1.5">
            {records.map(r => {
              const meta = STATUS_META[r.status] ?? STATUS_META.NOT_SUBMITTED
              const isPresent = r.status === 'PRESENT' || r.status === 'LATE_PRESENT'
              return (
                <div key={r.id} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl', isDark ? 'hover:bg-dark-800' : 'hover:bg-slate-50')}>
                  <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
                  <span className={clsx('flex-1 text-sm font-semibold', isDark ? 'text-slate-200' : 'text-slate-800')}>{fmtDate(r.date)}</span>
                  <span className={clsx('text-xs font-semibold', meta.color)}>{meta.label}</span>
                  {isPresent && r.markedAt && <span className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{fmtTime(r.markedAt)}</span>}
                  {isPresent ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : r.status === 'ABSENT' ? <XCircle size={13} className="text-red-400 shrink-0" /> : <Clock size={13} className={clsx('shrink-0', isDark ? 'text-slate-600' : 'text-slate-300')} />}
                </div>
              )
            })}
          </div>
          {more && (
            <button onClick={() => load(page + 1)} disabled={loading}
              className={clsx('w-full mt-3 py-2 border rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50',
                isDark ? 'border-white/8 text-slate-300 hover:bg-dark-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {loading ? <><Loader2 size={13} className="animate-spin" />Loading…</> : `Load more (${total - records.length} remaining)`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
