import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

interface Student {
  id: string; name: string; usn: string; isActive: boolean
  floor: string; room: string; year: string; semester: string; academicYear: string
  lastLogin: string | null; createdAt: string
}

export default function AdminStudentsPage() {
  const { isDark } = useTheme()
  const [students, setStudents] = useState<Student[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      const r = await api.get(`/admin/students?${params}`)
      if (r.data.success) { setStudents(r.data.data.students); setTotal(r.data.data.total) }
    } finally { setLoading(false) }
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  async function toggleStatus(s: Student) {
    setToggling(s.id)
    try {
      await api.patch(`/admin/students/${s.id}/status`, { isActive: !s.isActive })
      load()
    } finally { setToggling(null) }
  }

  const totalPages = Math.ceil(total / 20)
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-violet-500/15 border border-violet-500/20':'bg-violet-50 border border-violet-200')}>
            <Users size={18} className={isDark?'text-violet-400':'text-violet-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Students</h1>
            <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>{total} total</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2', isDark?'text-slate-500':'text-slate-400')} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name or USN…" className="input-dark w-full pl-9 text-sm" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-dark text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-violet-400" /></div>
      ) : students.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
          <Users size={36} className={clsx('mx-auto mb-3', isDark?'text-slate-700':'text-slate-300')} />
          <p className={clsx('text-sm', isDark?'text-slate-500':'text-slate-400')}>No students found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className={clsx('rounded-2xl border overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                  s.isActive ? isDark?'bg-violet-500/20 text-violet-400':'bg-violet-100 text-violet-700'
                              : isDark?'bg-slate-700 text-slate-500':'bg-slate-100 text-slate-400')}>
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-semibold', isDark?'text-slate-200':'text-slate-800')}>{s.name}</p>
                  <p className={clsx('text-xs font-mono', isDark?'text-slate-500':'text-slate-400')}>{s.usn}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={clsx('text-xs font-mono', isDark?'text-slate-500':'text-slate-400')}>{s.floor} · {s.room}</span>
                  {s.isActive
                    ? <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Active</span>
                    : <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Inactive</span>}
                  {expanded === s.id ? <ChevronUp size={14} className={isDark?'text-slate-500':'text-slate-400'} /> : <ChevronDown size={14} className={isDark?'text-slate-500':'text-slate-400'} />}
                </div>
              </div>
              {expanded === s.id && (
                <div className={clsx('border-t px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4', isDark?'border-white/5 bg-dark-800':'border-slate-100 bg-slate-50')}>
                  {([['Year', s.year],['Semester', s.semester],['Acad. Year', s.academicYear],['Last Login', fmt(s.lastLogin)]] as [string,string][]).map(([l,v])=>(
                    <div key={l}>
                      <p className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>{l}</p>
                      <p className={clsx('text-sm font-semibold mt-0.5', isDark?'text-slate-200':'text-slate-800')}>{v}</p>
                    </div>
                  ))}
                  <div className="col-span-2 sm:col-span-4 flex justify-end mt-2">
                    <button disabled={toggling === s.id} onClick={() => toggleStatus(s)}
                      className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50',
                        s.isActive
                          ? isDark?'border-red-500/30 text-red-400 hover:bg-red-500/10':'border-red-200 text-red-600 hover:bg-red-50'
                          : isDark?'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10':'border-emerald-200 text-emerald-600 hover:bg-emerald-50')}>
                      {toggling === s.id ? <Loader2 size={12} className="animate-spin" /> : s.isActive ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className={clsx('px-3 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-40', isDark?'border-white/8 text-slate-300':'border-slate-200 text-slate-600')}>Prev</button>
          <span className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            className={clsx('px-3 py-1.5 rounded-xl border text-xs font-medium disabled:opacity-40', isDark?'border-white/8 text-slate-300':'border-slate-200 text-slate-600')}>Next</button>
        </div>
      )}
    </div>
  )
}
