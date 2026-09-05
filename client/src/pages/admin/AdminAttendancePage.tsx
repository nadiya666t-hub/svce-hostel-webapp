import { useState, useEffect, useCallback } from 'react'
import { CalendarCheck, Loader2, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface StudentAtt {
  id: string; name: string; usn: string; floor: string; room: string
  status: string; markedAt: string | null; locationType: string | null; distance: number | null
}
interface Summary { total: number; present: number; absent: number; notSubmitted: number }

const STATUS_META: Record<string,{label:string;color:string;dot:string}> = {
  PRESENT:       { label:'Present',       color:'text-emerald-400', dot:'bg-emerald-500' },
  LATE_PRESENT:  { label:'Late Present',  color:'text-blue-400',    dot:'bg-blue-500'    },
  ABSENT:        { label:'Absent',        color:'text-red-400',     dot:'bg-red-500'     },
  NOT_SUBMITTED: { label:'Not Submitted', color:'text-slate-400',   dot:'bg-slate-500'   },
}

function fmt12(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
}

export default function AdminAttendancePage() {
  const { isDark } = useTheme()
  const today = new Date().toISOString().slice(0, 10)
  const [date,     setDate]     = useState(today)
  const [students, setStudents] = useState<StudentAtt[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('')
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/admin/attendance/daily?date=${date}`)
      if (r.data.success) { setStudents(r.data.data.students); setSummary(r.data.data.summary) }
    } finally { setLoading(false) }
  }, [date])

  useEffect(() => { load() }, [load])

  const visible = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q)
    const matchFilter = !filter || s.status === filter
    return matchSearch && matchFilter
  })

  const pct = summary ? Math.round(((summary.present) / Math.max(1, summary.total)) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-emerald-500/15 border border-emerald-500/20':'bg-emerald-50 border border-emerald-200')}>
          <CalendarCheck size={18} className={isDark?'text-emerald-400':'text-emerald-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Attendance</h1>
          <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>Daily attendance overview</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today}
          className={clsx('input-dark text-sm', isDark?'':'border-slate-200')} />
        {summary && (
          <div className="flex gap-2 flex-wrap">
            {[
              { label:`Present ${summary.present}`,      color:'text-emerald-400', bg:isDark?'bg-emerald-500/10 border-emerald-500/20':'bg-emerald-50 border-emerald-200' },
              { label:`Absent ${summary.absent}`,        color:'text-red-400',     bg:isDark?'bg-red-500/10 border-red-500/20':'bg-red-50 border-red-200'               },
              { label:`Pending ${summary.notSubmitted}`, color:'text-slate-400',   bg:isDark?'bg-dark-800 border-white/8':'bg-slate-50 border-slate-200'                  },
            ].map(b => (
              <span key={b.label} className={clsx('text-xs font-semibold px-3 py-1 rounded-full border', b.color, b.bg)}>{b.label}</span>
            ))}
            <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full border',
              isDark?'bg-violet-500/10 border-violet-500/20 text-violet-400':'bg-violet-50 border-violet-200 text-violet-600')}>
              {pct}% attendance
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2', isDark?'text-slate-500':'text-slate-400')} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…" className="input-dark w-full pl-9 text-sm" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input-dark text-sm">
          <option value="">All Status</option>
          <option value="PRESENT">Present</option>
          <option value="LATE_PRESENT">Late Present</option>
          <option value="ABSENT">Absent</option>
          <option value="NOT_SUBMITTED">Not Submitted</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-emerald-400" /></div>
      ) : (
        <div className={clsx('rounded-2xl border overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className={clsx('grid text-xs font-semibold uppercase tracking-widest px-4 py-3 border-b', isDark?'text-slate-500 border-white/5':'text-slate-400 border-slate-100',
            'grid-cols-[1fr_auto_auto_auto_auto]')}>
            <span>Student</span><span className="text-right hidden sm:block">Room</span>
            <span className="text-right">Status</span><span className="text-right hidden md:block">Time</span>
            <span className="text-right hidden md:block">Location</span>
          </div>
          {visible.length === 0 ? (
            <div className="py-12 text-center">
              <p className={clsx('text-sm', isDark?'text-slate-500':'text-slate-400')}>No records found.</p>
            </div>
          ) : visible.map(s => {
            const meta = STATUS_META[s.status] ?? STATUS_META.NOT_SUBMITTED
            return (
              <div key={s.id} className={clsx('grid items-center px-4 py-3 border-b last:border-0 grid-cols-[1fr_auto_auto_auto_auto] gap-2',
                isDark?'border-white/5':'border-slate-50')}>
                <div className="min-w-0">
                  <p className={clsx('text-sm font-semibold truncate', isDark?'text-slate-200':'text-slate-800')}>{s.name}</p>
                  <p className={clsx('text-xs font-mono', isDark?'text-slate-600':'text-slate-400')}>{s.usn}</p>
                </div>
                <span className={clsx('text-xs hidden sm:block', isDark?'text-slate-500':'text-slate-400')}>{s.floor}·{s.room}</span>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', meta.dot)} />
                  <span className={clsx('text-xs font-semibold', meta.color)}>{meta.label}</span>
                </div>
                <span className={clsx('text-xs hidden md:block text-right', isDark?'text-slate-500':'text-slate-400')}>
                  {s.markedAt ? fmt12(s.markedAt) : '—'}
                </span>
                <span className={clsx('text-xs hidden md:block text-right', isDark?'text-slate-500':'text-slate-400')}>
                  {s.locationType === 'HOSTEL' ? <CheckCircle2 size={13} className="text-emerald-400 inline" />
                    : s.locationType === 'COLLEGE' ? <CheckCircle2 size={13} className="text-blue-400 inline" />
                    : s.status === 'NOT_SUBMITTED' ? <Clock size={13} className="text-slate-500 inline" />
                    : <XCircle size={13} className="text-red-400 inline" />}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
