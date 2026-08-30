import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Clock, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  NEW:          { label: 'New',         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    dot: 'bg-blue-500' },
  ACKNOWLEDGED: { label: 'Acknowledged',color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',  dot: 'bg-amber-500' },
  IN_PROGRESS:  { label: 'In Progress', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',dot: 'bg-violet-500' },
  RESOLVED:     { label: 'Resolved',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20',dot: 'bg-emerald-500' },
  REJECTED:     { label: 'Rejected',    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      dot: 'bg-red-500' },
  ESCALATED:    { label: 'Escalated',   color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20',    dot: 'bg-rose-500' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function OverseerProblemsPage() {
  const { isDark } = useTheme()
  const [problems, setProblems] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '30' }
      if (filter) params.status = filter
      if (search) params.search = search
      const r = await api.get('/overseer/problems', { params })
      if (r.data.success) { setProblems(r.data.data.data); setTotal(r.data.data.total) }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter, search])

  const filters = ['', 'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'REJECTED']

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-orange-500/15 border border-orange-500/20' : 'bg-orange-50 border border-orange-200')}>
            <AlertTriangle size={18} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>Problems</h1>
            <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{total} total</p>
          </div>
        </div>
        <button onClick={load} className={clsx('p-2 rounded-xl transition-colors', isDark ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100')}><RefreshCw size={16} /></button>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name, USN or problem…"
        className={clsx('input-dark w-full mb-4')} />

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all', filter === f ? 'bg-orange-500 text-white' : isDark ? 'bg-dark-800 border border-white/8 text-slate-400 hover:border-white/15' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300')}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-orange-400" /></div>
      ) : problems.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-slate-200')}>
          <AlertTriangle size={36} className={clsx('mx-auto mb-3', isDark ? 'text-slate-700' : 'text-slate-300')} />
          <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>No problems found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {problems.map(p => {
            const meta = STATUS_META[p.status as string] ?? STATUS_META.NEW
            const isOverdue = p.isOverdue as boolean
            const hoursLeft = p.hoursRemaining as number
            return (
              <Link key={p.id as string} to={`/overseer/problems/${p.id}`}
                className={clsx('flex items-center gap-3 p-4 rounded-2xl border transition-all hover:-translate-y-0.5', isDark ? 'bg-dark-900 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')}>
                <span className={clsx('w-2 h-2 rounded-full shrink-0', meta.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={clsx('text-sm font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{p.studentName as string}</p>
                    <span className={clsx('text-[10px] font-mono', isDark ? 'text-slate-500' : 'text-slate-400')}>{p.studentUsn as string}</span>
                  </div>
                  <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-600')}>{(p.category as string).replace(/_/g,' ')} · Room {p.roomNumber as string} · {p.floor as string}</p>
                  <p className={clsx('text-xs mt-0.5 line-clamp-1', isDark ? 'text-slate-500' : 'text-slate-400')}>{p.description as string}</p>
                  <p className={clsx('text-[10px] mt-1', isDark ? 'text-slate-600' : 'text-slate-400')}>{fmtDate(p.createdAt as string)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', meta.bg, meta.color)}>{meta.label}</span>
                  {isOverdue
                    ? <span className="text-[10px] text-rose-400 font-bold">OVERDUE</span>
                    : !['RESOLVED','REJECTED','ESCALATED'].includes(p.status as string) && (
                      <span className={clsx('text-[10px] flex items-center gap-1', hoursLeft < 6 ? 'text-rose-400' : hoursLeft < 24 ? 'text-amber-400' : isDark ? 'text-slate-500' : 'text-slate-400')}>
                        <Clock size={10} /> {hoursLeft}h left
                      </span>
                    )}
                </div>
                <ArrowRight size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
