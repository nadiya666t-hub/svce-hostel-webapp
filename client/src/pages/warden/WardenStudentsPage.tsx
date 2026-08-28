import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface Student { id:string;name:string;usn:string;email?:string;phone?:string;floor:string;room:string;academicYear:string;status:string;isActive:boolean;photoUrl?:string }

function StudentDetail({ id, onClose }: { id:string; onClose:()=>void }) {
  const { isDark } = useTheme()
  const [data, setData] = useState<Record<string,unknown>|null>(null)
  useEffect(()=>{ wardenService.getStudent(id).then(r=>{ if(r.success) setData(r.data) }) },[id])
  if (!data) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-accent-400"/></div>
  const s = data as Record<string,unknown>
  const photoSrc = (s.photoUrl as string)?.startsWith('/') ? `/api/uploads${(s.photoUrl as string).replace('/uploads','')}` : s.photoUrl as string
  const fmt = (iso?:string) => iso ? new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'
  return (
    <div className={clsx('rounded-2xl border p-5 mt-2 animate-slide-down',isDark?'bg-dark-800 border-white/8':'bg-slate-50 border-slate-200')}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border dark:border-white/10 border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
            {s.photoUrl ? <img src={photoSrc} alt={s.name as string} className="w-full h-full object-cover"/> : <span className={clsx('text-xl font-bold',isDark?'text-slate-400':'text-slate-500')}>{(s.name as string).charAt(0)}</span>}
          </div>
          <div>
            <p className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>{s.name as string}</p>
            <p className={clsx('text-sm font-mono',isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</p>
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block',
              s.isActive?'bg-emerald-500/10 text-emerald-500':'bg-red-500/10 text-red-500')}>{s.status as string}</span>
          </div>
        </div>
        <button onClick={onClose} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {([
          ['Course',s.course],['Branch',s.branch],['Admission Year',s.admissionYear],
          ['Year',s.year],['Semester',s.semester],['Academic Year',s.academicYear],
          ['Gender',s.gender],['Blood Group',s.bloodGroup],['Floor · Room',`${s.floor} · ${s.room}`],
          ['Phone',s.phone],['Email',s.email],['Parent',s.parentName],
          ['Parent Phone',s.parentPhone],['Last Login',fmt(s.lastLoginAt as string)],
        ] as [string,unknown][]).filter(([,v])=>v).map(([l,v])=>(
          <div key={l} className={clsx('rounded-xl p-2.5',isDark?'bg-dark-700':'bg-white border border-slate-200')}>
            <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5',isDark?'text-slate-600':'text-slate-400')}>{l}</p>
            <p className={clsx('font-semibold truncate',isDark?'text-slate-200':'text-slate-700')}>{String(v)}</p>
          </div>
        ))}
        {s.fee ? (
          <div className={clsx('rounded-xl p-2.5 col-span-2',isDark?'bg-dark-700':'bg-white border border-slate-200')}>
            <p className={clsx('text-[10px] uppercase tracking-wide mb-1',isDark?'text-slate-600':'text-slate-400')}>Fees</p>
            <p className={clsx('font-semibold',isDark?'text-slate-200':'text-slate-700')}>
              Paid: ₹{Number((s.fee as Record<string,number>).paidAmount).toLocaleString('en-IN')} · Pending: ₹{Number((s.fee as Record<string,number>).pendingAmount).toLocaleString('en-IN')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function WardenStudentsPage() {
  const { isDark } = useTheme()
  const [students, setStudents] = useState<Student[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [floor,    setFloor]    = useState('')
  const [room,     setRoom]     = useState('')
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const [expanded, setExpanded] = useState<string|null>(null)
  const LIMIT = 20

  const load = useCallback(async (p=1) => {
    setLoading(true)
    try {
      const r = await wardenService.getStudents({ search, floor, room, status: status||undefined, page:p, limit:LIMIT })
      if (r.success) { setStudents(r.data.students); setTotal(r.data.total); setPage(p) }
    } finally { setLoading(false) }
  },[search, floor, room, status])

  useEffect(()=>{ const t=setTimeout(()=>load(1),350); return ()=>clearTimeout(t) },[search, floor, room, status, load])

  const totalPages = Math.ceil(total/LIMIT)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-accent-600/15 border border-accent-600/20':'bg-blue-50 border border-blue-200')}>
            <Users size={18} className={isDark?'text-accent-400':'text-blue-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Students</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{total} students</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="relative col-span-2 sm:col-span-2">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2',isDark?'text-slate-500':'text-slate-400')}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or USN…" className="input-dark w-full pl-8 text-sm"/>
        </div>
        <select value={floor} onChange={e=>setFloor(e.target.value)} className="input-dark text-sm">
          <option value="">All Floors</option>
          {['1st Floor','2nd Floor','3rd Floor','4th Floor'].map(f=><option key={f}>{f}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="input-dark text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-accent-400"/></div>
        : students.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No students found.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {students.map(s=>(
                <div key={s.id}>
                  <button onClick={()=>setExpanded(expanded===s.id?null:s.id)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left rounded-2xl border transition-all hover:-translate-y-0.5',
                      isDark?'bg-dark-900 border-white/5 hover:border-white/10':'bg-white border-slate-200 hover:border-slate-300 shadow-sm')}>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border dark:border-white/10 border-slate-200 bg-slate-100 flex items-center justify-center">
                      {s.photoUrl ? <img src={`/api/uploads${s.photoUrl.replace('/uploads','')}`} alt={s.name} className="w-full h-full object-cover"/> : <span className={clsx('text-sm font-bold',isDark?'text-slate-400':'text-slate-500')}>{s.name.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-semibold truncate',isDark?'text-slate-100':'text-slate-900')}>{s.name}</p>
                      <p className={clsx('text-xs font-mono',isDark?'text-slate-500':'text-slate-400')}>{s.usn}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className={clsx('text-xs font-semibold',isDark?'text-slate-300':'text-slate-700')}>{s.floor} · Rm {s.room}</p>
                      <p className={clsx('text-xs',isDark?'text-slate-500':'text-slate-400')}>{s.academicYear}</p>
                    </div>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',s.isActive?'bg-emerald-500/10 text-emerald-500':'bg-red-500/10 text-red-500')}>{s.isActive?'Active':'Inactive'}</span>
                  </button>
                  {expanded===s.id && <StudentDetail id={s.id} onClose={()=>setExpanded(null)}/>}
                </div>
              ))}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className={clsx('text-xs',isDark?'text-slate-500':'text-slate-400')}>Page {page} of {totalPages} · {total} total</p>
                <div className="flex gap-2">
                  <button disabled={page<=1} onClick={()=>load(page-1)} className={clsx('p-2 rounded-xl border disabled:opacity-40',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}><ChevronLeft size={15}/></button>
                  <button disabled={page>=totalPages} onClick={()=>load(page+1)} className={clsx('p-2 rounded-xl border disabled:opacity-40',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}><ChevronRight size={15}/></button>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  )
}
