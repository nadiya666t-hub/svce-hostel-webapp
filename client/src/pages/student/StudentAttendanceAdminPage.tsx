import { useState, useEffect } from 'react'
import { BarChart2, CheckCircle2, XCircle, Clock, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/services/api'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface StudentRow {
  id: string; name: string; usn: string; floor: string; room: string
  status: string; markedAt: string | null; locationType: string | null; distance: number | null
}
interface DailyData {
  date: string
  summary: { total: number; present: number; absent: number; notSubmitted: number }
  students: StudentRow[]
}

const STATUS_META: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  PRESENT:      { label: 'Present',       color: 'text-emerald-500', dot: 'bg-emerald-500', icon: CheckCircle2 },
  LATE_PRESENT: { label: 'Late Present',  color: 'text-amber-400',   dot: 'bg-amber-400',   icon: CheckCircle2 },
  ABSENT:       { label: 'Absent',        color: 'text-red-500',     dot: 'bg-red-500',     icon: XCircle },
  NOT_SUBMITTED:{ label: 'Not Submitted', color: 'text-slate-400',   dot: 'bg-slate-400',   icon: Clock },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function StudentAttendanceAdminPage() {
  const { isDark } = useTheme()
  const [data, setData] = useState<DailyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load(d?: string) {
    setLoading(true)
    try {
      const res = await api.get('/admin/attendance/daily', { params: d ? { date: d } : {} })
      if (res.data.success) setData(res.data.data)
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function applyFilter(rows: StudentRow[]) {
    return rows.filter(r => {
      const matchFilter = filter === 'ALL' || r.status === filter
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.usn.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
  }

  const filtered = data ? applyFilter(data.students) : []

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
            <BarChart2 size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Attendance Monitor</h1>
            <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Daily hostel attendance overview</p>
          </div>
        </div>
        <button onClick={() => load(date || undefined)} disabled={loading}
          className={clsx('p-2 rounded-xl transition-colors disabled:opacity-50', isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-dark-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3 mb-5">
        <input type="date" value={date} onChange={e => { setDate(e.target.value); load(e.target.value) }}
          className={clsx('px-3 py-2 rounded-xl border text-sm outline-none transition-all',
            isDark ? 'bg-dark-800 border-white/8 text-slate-200' : 'bg-white border-slate-200 text-slate-800')} />
        <span className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
          {data ? `Showing ${data.date}` : 'Today'}
        </span>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-accent-400" /></div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { l: 'Total',         v: data.summary.total,        c: isDark ? 'text-slate-100' : 'text-slate-800' },
              { l: 'Present',       v: data.summary.present,      c: 'text-emerald-500' },
              { l: 'Not Submitted', v: data.summary.notSubmitted, c: isDark ? 'text-slate-400' : 'text-slate-500' },
              { l: 'Absent',        v: data.summary.absent,       c: 'text-red-500' },
            ].map(({ l, v, c }) => (
              <div key={l} className={clsx('rounded-2xl border p-4 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
                <p className={clsx('text-2xl font-bold', c)}>{v}</p>
                <p className={clsx('text-xs font-semibold mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>{l}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input type="text" placeholder="Search name or USN…" value={search} onChange={e => setSearch(e.target.value)}
              className={clsx('flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border text-sm outline-none',
                isDark ? 'bg-dark-800 border-white/8 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400')} />
            {['ALL', 'PRESENT', 'LATE_PRESENT', 'NOT_SUBMITTED', 'ABSENT'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  filter === f ? 'bg-accent-600 text-white' : isDark ? 'bg-dark-800 border border-white/8 text-slate-300 hover:bg-dark-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                {f === 'ALL' ? 'All' : f === 'NOT_SUBMITTED' ? 'Not Submitted' : STATUS_META[f]?.label ?? f}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className={clsx('rounded-2xl border p-10 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
                <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>No students match the filter.</p>
              </div>
            ) : filtered.map(s => {
              const meta = STATUS_META[s.status] ?? STATUS_META.NOT_SUBMITTED
              const StatusIcon = meta.icon
              const isOpen = expanded === s.id
              return (
                <div key={s.id} className={clsx('rounded-xl border overflow-hidden', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200 shadow-sm')}>
                  <button onClick={() => setExpanded(isOpen ? null : s.id)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors', isDark ? 'hover:bg-dark-800' : 'hover:bg-slate-50')}>
                    <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
                    <span className={clsx('flex-1 text-sm font-semibold', isDark ? 'text-slate-200' : 'text-slate-800')}>{s.name}</span>
                    <span className={clsx('text-xs font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>{s.usn}</span>
                    <span className={clsx('text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>{s.floor} · Rm {s.room}</span>
                    <span className={clsx('flex items-center gap-1 text-xs font-semibold', meta.color)}>
                      <StatusIcon size={12} /> {meta.label}
                    </span>
                    {isOpen ? <ChevronUp size={13} className={isDark ? 'text-slate-500' : 'text-slate-400'} /> : <ChevronDown size={13} className={isDark ? 'text-slate-500' : 'text-slate-400'} />}
                  </button>
                  {isOpen && (
                    <div className={clsx('border-t px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs', isDark ? 'border-white/5 bg-dark-800' : 'border-slate-100 bg-slate-50')}>
                      {[
                        { l: 'Marked At', v: s.markedAt ? fmtTime(s.markedAt) : '—' },
                        { l: 'Location',  v: s.locationType ?? '—' },
                        { l: 'Distance',  v: s.distance != null ? `${s.distance} m` : '—' },
                        { l: 'Room',      v: `${s.floor}, Room ${s.room}` },
                      ].map(({ l, v }) => (
                        <div key={l}>
                          <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5', isDark ? 'text-slate-600' : 'text-slate-400')}>{l}</p>
                          <p className={clsx('font-semibold', isDark ? 'text-slate-300' : 'text-slate-700')}>{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className={clsx('text-xs mt-3 text-right', isDark ? 'text-slate-600' : 'text-slate-400')}>
            Showing {filtered.length} of {data.students.length} students
          </p>
        </>
      )}
    </div>
  )
}
