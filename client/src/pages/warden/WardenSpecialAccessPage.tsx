import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, Loader2, X, CheckCircle2 } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string,{label:string;color:string}> = {
  ACTIVE:    {label:'Active',    color:'text-emerald-500'},
  USED:      {label:'Used',      color:'text-blue-400'},
  EXPIRED:   {label:'Expired',   color:'text-slate-400'},
  CANCELLED: {label:'Cancelled', color:'text-red-400'},
}
function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function WardenSpecialAccessPage() {
  const { isDark } = useTheme()
  const [windows,  setWindows]  = useState<Record<string,unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter,   setFilter]   = useState('ALL')
  const [students, setStudents] = useState<{id:string;name:string;usn:string}[]>([])
  const [studentId,setStudentId]= useState('')
  const [date,     setDate]     = useState('')
  const [start,    setStart]    = useState('20:30')
  const [end,      setEnd]      = useState('20:40')
  const [reason,   setReason]   = useState('')
  const [location, setLocation] = useState('HOSTEL_CAMPUS')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const load = useCallback(async(s='ALL')=>{
    setLoading(true)
    try {
      const r = await wardenService.getSpecialWindows({status:s==='ALL'?undefined:s})
      if(r.success) setWindows(r.data)
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{
    load(filter)
    wardenService.getStudents({limit:200}).then(r=>{ if(r.success) setStudents(r.data.students) })
  },[load, filter])

  async function handleCreate(e:React.FormEvent){
    e.preventDefault(); setError('')
    if(!studentId||!date||!start||!end||!reason){ setError('All fields required.'); return }
    setSaving(true)
    try {
      const r = await wardenService.createSpecialWindow({studentId,date,startTime:start,endTime:end,reason,approvedLocation:location})
      if(r.success){ setShowForm(false); resetForm(); load(filter) }
      else setError(r.message??'Failed.')
    } catch(e2:unknown){ setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message??'Failed.') }
    finally { setSaving(false) }
  }

  function resetForm(){ setStudentId('');setDate('');setStart('20:30');setEnd('20:40');setReason('');setLocation('HOSTEL_CAMPUS');setError('') }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-accent-600/15 border border-accent-600/20':'bg-blue-50 border border-blue-200')}>
            <ShieldCheck size={18} className={isDark?'text-accent-400':'text-blue-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Special Attendance Access</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Grant college campus or late-return permissions</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={()=>setShowForm(true)} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5">
            <Plus size={15}/> New Permission
          </button>
        )}
      </div>

      {showForm && (
        <div className={clsx('rounded-2xl border p-5 mb-5 animate-slide-down',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>Grant Special Permission</h2>
            <button onClick={()=>{setShowForm(false);resetForm()}} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Student</label>
              <select value={studentId} onChange={e=>setStudentId(e.target.value)} className="input-dark w-full">
                <option value="">Select student…</option>
                {students.map(s=><option key={s.id} value={s.id}>{s.name} — {s.usn}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">Start Time</label>
              <input type="time" value={start} onChange={e=>setStart(e.target.value)} className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">End Time</label>
              <input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="input-dark w-full"/>
            </div>
            <div>
              <label className="field-label">Approved Location</label>
              <select value={location} onChange={e=>setLocation(e.target.value)} className="input-dark w-full">
                <option value="HOSTEL_CAMPUS">Hostel Campus (Late Return)</option>
                <option value="COLLEGE_CAMPUS">College Campus</option>
              </select>
            </div>
            <div>
              <label className="field-label">Reason</label>
              <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for permission…" className="input-dark w-full"/>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
                {saving?<Loader2 size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>} Grant Permission
              </button>
              <button type="button" onClick={()=>{setShowForm(false);resetForm()}} className={clsx('px-4 py-2.5 rounded-xl border text-sm',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {['ALL','ACTIVE','USED','EXPIRED','CANCELLED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={clsx('px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter===f?'bg-accent-600 text-white':isDark?'bg-dark-800 border border-white/8 text-slate-300 hover:bg-dark-700':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f==='ALL'?'All':STATUS_META[f]?.label??f}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-accent-400"/></div>
        : windows.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <ShieldCheck size={36} className={clsx('mx-auto mb-3',isDark?'text-slate-700':'text-slate-300')}/>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No permissions found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {windows.map(w=>{
              const win=w as Record<string,unknown>
              const student=win.student as Record<string,unknown>|null
              const meta=STATUS_META[win.windowStatus as string]??STATUS_META.ACTIVE
              return (
                <div key={win.id as string} className={clsx('rounded-2xl border p-4',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={clsx('text-sm font-bold',isDark?'text-slate-100':'text-slate-900')}>
                          {student?.name as string??'Unknown'} <span className={clsx('text-xs font-mono font-normal',isDark?'text-slate-500':'text-slate-400')}>({student?.usn as string})</span>
                        </p>
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',win.windowStatus==='ACTIVE'?'bg-emerald-500/10':'bg-slate-500/10',meta.color)}>{meta.label}</span>
                      </div>
                      <p className={clsx('text-xs mb-1',isDark?'text-slate-400':'text-slate-500')}>
                        {fmt(win.date as string)} · <span className="font-mono font-semibold">{win.startTime as string} – {win.endTime as string} IST</span>
                      </p>
                      <p className={clsx('text-xs',isDark?'text-slate-500':'text-slate-400')}>
                        Location: <span className="font-semibold">{win.approvedLocation==='COLLEGE_CAMPUS'?'College Campus':'Hostel Campus'}</span>
                        {win.reason ? ` · ${win.reason as string}` : ''}
                      </p>
                      {win.approvedBy ? <p className={clsx('text-[10px] mt-1',isDark?'text-slate-600':'text-slate-400')}>Approved by {win.approvedBy as string} · {fmt(win.approvedAt as string)}</p> : null}
                    </div>
                    {win.windowStatus==='ACTIVE' && (
                      <button onClick={async()=>{ await wardenService.cancelSpecialWindow(win.id as string); load(filter) }}
                        className="shrink-0 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
