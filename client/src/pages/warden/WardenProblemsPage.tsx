import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string,{label:string;color:string;dot:string}> = {
  PENDING:     {label:'Pending',     color:'text-amber-500',  dot:'bg-amber-500'},
  IN_PROGRESS: {label:'In Progress', color:'text-blue-400',   dot:'bg-blue-400'},
  RESOLVED:    {label:'Resolved',    color:'text-emerald-500',dot:'bg-emerald-500'},
}
const CAT_LABEL: Record<string,string> = {
  NO_WATER:'No Water',ELECTRICITY:'Electricity',CLEANING:'Cleaning',
  PLUMBING:'Plumbing',FURNITURE:'Furniture',WIFI:'Wi-Fi',OTHER:'Other',
}
function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }
function fmtFull(iso:string){ return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) }

export default function WardenProblemsPage() {
  const { isDark } = useTheme()
  const [problems, setProblems] = useState<Record<string,unknown>[]>([])
  const [total,    setTotal]    = useState(0)
  const [filter,   setFilter]   = useState('ALL')
  const [catFilter,setCatFilter]= useState('ALL')
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [updating, setUpdating] = useState<string|null>(null)
  const [note,     setNote]     = useState('')
  const [newStatus,setNewStatus]= useState('IN_PROGRESS')
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async(status='ALL',q='')=>{
    setLoading(true)
    try {
      const r = await wardenService.getProblems({status:status==='ALL'?undefined:status, search:q||undefined, limit:100})
      if(r.success){ setProblems(r.data.problems); setTotal(r.data.total) }
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{ const t=setTimeout(()=>load(filter,search),350); return ()=>clearTimeout(t) },[filter,search,load])

  async function handleUpdate(id:string){
    setSaving(true)
    try { await wardenService.updateProblemStatus(id,newStatus,note||undefined); setUpdating(null); setNote(''); load(filter,search) }
    finally { setSaving(false) }
  }

  const displayProblems = catFilter==='ALL' ? problems
    : problems.filter(p=>(p as Record<string,unknown>).category===catFilter)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-orange-500/15 border border-orange-500/20':'bg-orange-50 border border-orange-200')}>
          <AlertTriangle size={18} className={isDark?'text-orange-400':'text-orange-600'}/>
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Problems</h1>
          <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{total} total · {displayProblems.length} shown</p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2',isDark?'text-slate-500':'text-slate-400')}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by student name or USN…" className="input-dark w-full pl-8 text-sm"/>
        </div>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="input-dark text-sm">
          <option value="ALL">All Categories</option>
          {Object.entries(CAT_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {['ALL','PENDING','IN_PROGRESS','RESOLVED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={clsx('px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter===f?'bg-accent-600 text-white':isDark?'bg-dark-800 border border-white/8 text-slate-300 hover:bg-dark-700':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f==='ALL'?'All':f==='IN_PROGRESS'?'In Progress':STATUS_META[f]?.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-orange-400"/></div>
        : displayProblems.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No problems found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayProblems.map(p=>{
              const prob=p as Record<string,unknown>
              const student=prob.student as Record<string,unknown>
              const meta=STATUS_META[prob.status as string]??STATUS_META.PENDING
              const isOpen=expanded===prob.id
              return (
                <div key={prob.id as string} className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <button onClick={()=>setExpanded(isOpen?null:prob.id as string)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                    <span className={clsx('w-2 h-2 rounded-full shrink-0',meta.dot)}/>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-bold',isDark?'text-slate-100':'text-slate-900')}>{CAT_LABEL[prob.category as string]} — {student.name as string}</p>
                      <p className={clsx('text-xs truncate',isDark?'text-slate-500':'text-slate-400')}>{prob.description as string}</p>
                    </div>
                    <span className={clsx('text-xs font-mono shrink-0',isDark?'text-slate-500':'text-slate-400')}>Rm {prob.roomNumber as string}</span>
                    <span className={clsx('text-xs font-semibold shrink-0',meta.color)}>{meta.label}</span>
                    {isOpen?<ChevronUp size={14} className={isDark?'text-slate-500':'text-slate-400'}/>:<ChevronDown size={14} className={isDark?'text-slate-500':'text-slate-400'}/>}
                  </button>

                  {isOpen && (
                    <div className={clsx('border-t px-4 py-4 space-y-3',isDark?'border-white/5 bg-dark-800':'border-slate-100 bg-slate-50')}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {([
                          ['Student',student.name],['USN',student.usn],['Room',`${student.floor}·${student.room}`],
                          ['Category',CAT_LABEL[prob.category as string]],['Reported',fmt(prob.createdAt as string)],
                          ...(prob.resolvedAt?[['Resolved',fmtFull(prob.resolvedAt as string)]]:[] as [string,unknown][]),
                          ...(prob.resolveNote?[['Warden Note',prob.resolveNote]]:[] as [string,unknown][]),
                        ] as [string,unknown][]).filter(([,v])=>v).map(([l,v])=>(
                          <div key={l} className={clsx('rounded-xl p-2.5',isDark?'bg-dark-700':'bg-white border border-slate-200')}>
                            <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5',isDark?'text-slate-600':'text-slate-400')}>{l}</p>
                            <p className={clsx('font-semibold',isDark?'text-slate-200':'text-slate-700')}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                      {prob.photoUrl ? (
                        <img src={`/api/uploads${(prob.photoUrl as string).replace('/uploads','')}`} alt="Problem"
                          className="w-full max-h-40 object-cover rounded-xl border dark:border-white/8 border-slate-200"/>
                      ) : null}
                      {(prob.status as string)!=='RESOLVED' && (
                        updating===prob.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              {['PENDING','IN_PROGRESS','RESOLVED'].map(s=>(
                                <button key={s} onClick={()=>setNewStatus(s)}
                                  className={clsx('flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                                    newStatus===s?'bg-accent-600 text-white border-accent-600':isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-100')}>
                                  {s==='IN_PROGRESS'?'In Progress':s.charAt(0)+s.slice(1).toLowerCase()}
                                </button>
                              ))}
                            </div>
                            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)…" rows={2}
                              className={clsx('w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none',isDark?'bg-dark-700 border-white/8 text-slate-100 placeholder-slate-600':'bg-white border-slate-200 text-slate-900 placeholder-slate-400')}/>
                            <div className="flex gap-2">
                              <button onClick={()=>handleUpdate(prob.id as string)} disabled={saving}
                                className="btn-accent text-sm px-4 py-2 disabled:opacity-50">
                                {saving?<Loader2 size={13} className="animate-spin"/>:'Update Status'}
                              </button>
                              <button onClick={()=>setUpdating(null)} className={clsx('px-4 py-2 rounded-xl text-sm border',isDark?'border-white/8 text-slate-400 hover:bg-dark-700':'border-slate-200 text-slate-500 hover:bg-slate-100')}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{setUpdating(prob.id as string);setNewStatus('IN_PROGRESS');setNote('')}} className="btn-accent text-sm px-4 py-2">Update Status</button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
