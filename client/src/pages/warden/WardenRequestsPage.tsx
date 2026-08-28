import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string,{label:string;color:string;dot:string}> = {
  PENDING:   {label:'Pending',   color:'text-amber-500',  dot:'bg-amber-500'},
  APPROVED:  {label:'Approved',  color:'text-emerald-500',dot:'bg-emerald-500'},
  REJECTED:  {label:'Rejected',  color:'text-red-500',    dot:'bg-red-500'},
  CANCELLED: {label:'Cancelled', color:'text-slate-400',  dot:'bg-slate-400'},
}
const TYPE_LABEL: Record<string,string> = {
  GOING_HOME:'Going Home',OUTING:'Outing',LEAVE:'Leave',EMERGENCY_LEAVE:'Emergency Leave',
  EMERGENCY:'Emergency',IMPORTANT:'Important',MODERATE:'Moderate',OTHER:'Other',
}
function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function WardenRequestsPage() {
  const { isDark } = useTheme()
  const [requests,  setRequests]  = useState<Record<string,unknown>[]>([])
  const [total,     setTotal]     = useState(0)
  const [filter,    setFilter]    = useState('ALL')
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState<string|null>(null)
  const [reviewing, setReviewing] = useState<string|null>(null)
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(async(status='ALL',q='')=>{
    setLoading(true)
    try {
      const r = await wardenService.getRequests({status:status==='ALL'?undefined:status, search:q||undefined, limit:100})
      if(r.success){ setRequests(r.data.requests); setTotal(r.data.total) }
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{ const t=setTimeout(()=>load(filter,search),350); return ()=>clearTimeout(t) },[filter,search,load])

  async function handleReview(id:string, action:'APPROVED'|'REJECTED'){
    setSaving(true)
    try { await wardenService.reviewRequest(id, action, note||undefined); setReviewing(null); setNote(''); load(filter,search) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-amber-500/15 border border-amber-500/20':'bg-amber-50 border border-amber-200')}>
          <ClipboardList size={18} className={isDark?'text-amber-400':'text-amber-600'}/>
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Requests</h1>
          <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{total} total</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2',isDark?'text-slate-500':'text-slate-400')}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by student name or USN…" className="input-dark w-full pl-8 text-sm"/>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {['ALL','PENDING','APPROVED','REJECTED','CANCELLED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={clsx('px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter===f?'bg-accent-600 text-white':isDark?'bg-dark-800 border border-white/8 text-slate-300 hover:bg-dark-700':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f==='ALL'?'All':STATUS_META[f]?.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-amber-400"/></div>
        : requests.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(r=>{
              const req=r as Record<string,unknown>
              const student=req.student as Record<string,unknown>
              const meta=STATUS_META[req.status as string]??STATUS_META.PENDING
              const isOpen=expanded===req.id
              return (
                <div key={req.id as string} className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <button onClick={()=>setExpanded(isOpen?null:req.id as string)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                    <span className={clsx('w-2 h-2 rounded-full shrink-0',meta.dot)}/>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-bold',isDark?'text-slate-100':'text-slate-900')}>{student.name as string}</p>
                      <p className={clsx('text-xs',isDark?'text-slate-500':'text-slate-400')}>
                        {TYPE_LABEL[req.type as string]??req.type as string} · {fmt(req.fromDate as string)} → {fmt(req.toDate as string)}
                      </p>
                    </div>
                    <span className={clsx('text-xs font-mono shrink-0',isDark?'text-slate-500':'text-slate-400')}>{student.usn as string}</span>
                    <span className={clsx('text-xs font-semibold shrink-0',meta.color)}>{meta.label}</span>
                    {isOpen?<ChevronUp size={14} className={isDark?'text-slate-500':'text-slate-400'}/>:<ChevronDown size={14} className={isDark?'text-slate-500':'text-slate-400'}/>}
                  </button>

                  {isOpen && (
                    <div className={clsx('border-t px-4 py-4 space-y-3',isDark?'border-white/5 bg-dark-800':'border-slate-100 bg-slate-50')}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {([
                          ['Student',student.name],['USN',student.usn],['Floor·Room',`${student.floor}·${student.room}`],
                          ['Type',TYPE_LABEL[req.type as string]],['From',fmt(req.fromDate as string)],['To',fmt(req.toDate as string)],
                          ['Destination',req.destination],['Reason',req.reason],['Details',req.additionalDetails],
                          ['Submitted',fmt(req.createdAt as string)],
                          ...(req.reviewedAt?[['Reviewed',fmt(req.reviewedAt as string)]]:[] as [string,unknown][]),
                        ] as [string,unknown][]).filter(([,v])=>v).map(([l,v])=>(
                          <div key={l} className={clsx('rounded-xl p-2.5',isDark?'bg-dark-700':'bg-white border border-slate-200')}>
                            <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5',isDark?'text-slate-600':'text-slate-400')}>{l}</p>
                            <p className={clsx('font-semibold',isDark?'text-slate-200':'text-slate-700')}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                      {req.reviewNote ? <p className={clsx('text-xs italic',isDark?'text-slate-400':'text-slate-500')}>Warden note: {req.reviewNote as string}</p> : null}

                      {(req.status as string)==='PENDING' && (
                        reviewing===req.id ? (
                          <div className="space-y-2">
                            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Rejection reason (optional)…" rows={2}
                              className={clsx('w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none',isDark?'bg-dark-700 border-white/8 text-slate-100 placeholder-slate-600':'bg-white border-slate-200 text-slate-900 placeholder-slate-400')}/>
                            <div className="flex gap-2">
                              <button onClick={()=>handleReview(req.id as string,'APPROVED')} disabled={saving}
                                className="flex-1 py-2 btn-accent text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                                {saving?<Loader2 size={13} className="animate-spin"/>:<CheckCircle2 size={13}/>} Approve
                              </button>
                              <button onClick={()=>handleReview(req.id as string,'REJECTED')} disabled={saving}
                                className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-center gap-1.5 hover:bg-red-500/20 disabled:opacity-50">
                                {saving?<Loader2 size={13} className="animate-spin"/>:<XCircle size={13}/>} Reject
                              </button>
                              <button onClick={()=>setReviewing(null)} className={clsx('px-3 py-2 rounded-xl text-sm border',isDark?'border-white/8 text-slate-400 hover:bg-dark-700':'border-slate-200 text-slate-500 hover:bg-slate-100')}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>setReviewing(req.id as string)} className="btn-accent text-sm px-4 py-2">Review Request</button>
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
