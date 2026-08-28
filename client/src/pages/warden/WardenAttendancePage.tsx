import { useState, useEffect, useCallback } from 'react'
import { CalendarCheck, Loader2, RefreshCw, Download } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const STATUS_META: Record<string,{label:string;color:string;dot:string}> = {
  PRESENT:       {label:'Present',       color:'text-emerald-500',dot:'bg-emerald-500'},
  LATE_PRESENT:  {label:'Late Present',  color:'text-amber-400',  dot:'bg-amber-400'},
  ABSENT:        {label:'Absent',        color:'text-red-500',    dot:'bg-red-500'},
  EXCUSED:       {label:'Excused',       color:'text-blue-400',   dot:'bg-blue-400'},
  NOT_SUBMITTED: {label:'Not Submitted', color:'text-slate-400',  dot:'bg-slate-400'},
}

function fmtTime(iso:string){ return new Date(iso).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true}) }

export default function WardenAttendancePage() {
  const { isDark } = useTheme()
  const today = new Date(Date.now()+5.5*60*60*1000).toISOString().slice(0,10)
  const [date,   setDate]   = useState(today)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [floor,  setFloor]  = useState('')
  const [room,   setRoom]   = useState('')
  const [data,   setData]   = useState<Record<string,unknown>|null>(null)
  const [loading,setLoading]= useState(true)

  const load = useCallback(async(d:string,f='ALL',fl='',rm='')=>{
    setLoading(true)
    try {
      const r = await wardenService.getAttendance({date:d, status:f==='ALL'?undefined:f, floor:fl||undefined, room:rm||undefined, limit:200})
      if(r.success) setData(r.data)
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{ load(date,filter,floor,room) },[date,filter,floor,room,load])

  const summary = data?.summary as Record<string,number>|undefined
  const allRecords = (data?.records as Record<string,unknown>[]|undefined)??[]

  // Build full list: submitted + NOT_SUBMITTED students
  const totalStudents = summary?.totalStudents ?? 0
  const submittedIds = new Set(allRecords.map(r=>(r.student as Record<string,unknown>).id as string))

  const records = allRecords.filter(r=>{
    if(!search) return true
    const s=r.student as Record<string,unknown>
    return (s.name as string).toLowerCase().includes(search.toLowerCase())||(s.usn as string).toLowerCase().includes(search.toLowerCase())
  })

  function exportCSV() {
    const rows = [['Student','USN','Floor','Room','Time','Status','Location','GPS Acc','Distance']]
    records.forEach(rec=>{
      const r=rec as Record<string,unknown>; const s=r.student as Record<string,unknown>
      const time=r.markedAt?new Date(r.markedAt as string).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour12:true}):'—'
      rows.push([s.name as string,s.usn as string,s.floor as string,s.room as string,time,r.status as string,String(r.verifiedLocation??'—'),r.gpsAccuracy!=null?`${Math.round(r.gpsAccuracy as number)}m`:'—',r.distanceFromHostel!=null?`${Math.round(r.distanceFromHostel as number)}m`:'—'])
    })
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`attendance_${date}.csv`; a.click()
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-emerald-500/15 border border-emerald-500/20':'bg-emerald-50 border border-emerald-200')}>
            <CalendarCheck size={18} className={isDark?'text-emerald-400':'text-emerald-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Attendance</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Daily records</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={records.length===0} className={clsx('p-2 rounded-xl disabled:opacity-40',isDark?'text-slate-500 hover:text-slate-300 hover:bg-dark-700':'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
            <Download size={16}/>
          </button>
          <button onClick={()=>load(date,filter,floor,room)} className={clsx('p-2 rounded-xl',isDark?'text-slate-500 hover:text-slate-300 hover:bg-dark-700':'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
            <RefreshCw size={16} className={loading?'animate-spin':''}/>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <input type="date" value={date} onChange={e=>{setDate(e.target.value)}}
          className={clsx('px-3 py-2 rounded-xl border text-sm outline-none',isDark?'bg-dark-800 border-white/8 text-slate-200':'bg-white border-slate-200 text-slate-800')}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…" className="input-dark text-sm"/>
        <select value={floor} onChange={e=>setFloor(e.target.value)} className="input-dark text-sm">
          <option value="">All Floors</option>
          {['1st Floor','2nd Floor','3rd Floor','4th Floor'].map(f=><option key={f}>{f}</option>)}
        </select>
        <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="Room no…" className="input-dark text-sm"/>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          {[
            {l:'Total',v:summary.totalStudents,c:isDark?'text-slate-100':'text-slate-800'},
            {l:'Present',v:summary.present,c:'text-emerald-500'},
            {l:'Absent',v:summary.absent,c:'text-red-500'},
            {l:'Late',v:summary.late,c:'text-amber-400'},
            {l:'Excused',v:summary.excused,c:'text-blue-400'},
            {l:'Rate',v:`${summary.percentage}%`,c:summary.percentage>=75?'text-emerald-500':'text-amber-500'},
          ].map(({l,v,c})=>(
            <div key={l} className={clsx('rounded-2xl border p-3 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
              <p className={clsx('text-xl font-bold',c)}>{v}</p>
              <p className={clsx('text-[10px] font-semibold mt-0.5',isDark?'text-slate-500':'text-slate-400')}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {['ALL','PRESENT','LATE_PRESENT','ABSENT','EXCUSED','NOT_SUBMITTED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={clsx('px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter===f?'bg-accent-600 text-white':isDark?'bg-dark-800 border border-white/8 text-slate-300 hover:bg-dark-700':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f==='ALL'?'All':f==='LATE_PRESENT'?'Late':f==='NOT_SUBMITTED'?'Not Submitted':STATUS_META[f]?.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-emerald-400"/></div>
        : (
          <div className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={clsx('border-b text-xs uppercase tracking-wide',isDark?'border-white/5 text-slate-500':'border-slate-100 text-slate-400')}>
                    {['Student','USN','Floor·Room','Time','Status','Location','Accuracy','Distance','Photo'].map(h=>(
                      <th key={h} className="text-left px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={clsx('divide-y',isDark?'divide-white/5':'divide-slate-50')}>
                  {records.map(rec=>{
                    const r=rec as Record<string,unknown>
                    const s=r.student as Record<string,unknown>
                    const meta=STATUS_META[r.status as string]??STATUS_META.NOT_SUBMITTED
                    return (
                      <tr key={r.id as string} className={clsx('transition-colors',isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                        <td className={clsx('px-3 py-2.5 font-semibold',isDark?'text-slate-200':'text-slate-800')}>{s.name as string}</td>
                        <td className={clsx('px-3 py-2.5 font-mono text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</td>
                        <td className={clsx('px-3 py-2.5 text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.floor as string}·{s.room as string}</td>
                        <td className={clsx('px-3 py-2.5 text-xs',isDark?'text-slate-400':'text-slate-500')}>{r.markedAt?fmtTime(r.markedAt as string):'—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={clsx('flex items-center gap-1 text-xs font-semibold',meta.color)}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full',meta.dot)}/>{meta.label}
                          </span>
                        </td>
                        <td className={clsx('px-3 py-2.5 text-xs',isDark?'text-slate-400':'text-slate-500')}>{String(r.verifiedLocation??'—')}</td>
                        <td className={clsx('px-3 py-2.5 text-xs',isDark?'text-slate-400':'text-slate-500')}>{r.gpsAccuracy!=null?`${Math.round(r.gpsAccuracy as number)}m`:'—'}</td>
                        <td className={clsx('px-3 py-2.5 text-xs',isDark?'text-slate-400':'text-slate-500')}>{r.distanceFromHostel!=null?`${Math.round(r.distanceFromHostel as number)}m`:'—'}</td>
                        <td className="px-3 py-2.5">
                          {r.photoUrl ? <a href={`/api/uploads${(r.photoUrl as string).replace('/uploads','')}`} target="_blank" rel="noreferrer" className="text-xs text-accent-400 hover:underline">View</a> : <span className={clsx('text-xs',isDark?'text-slate-600':'text-slate-300')}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                  {records.length===0 && (
                    <tr><td colSpan={9} className={clsx('px-4 py-10 text-center text-sm',isDark?'text-slate-500':'text-slate-400')}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={clsx('px-4 py-2 text-xs border-t',isDark?'border-white/5 text-slate-600':'border-slate-100 text-slate-400')}>
              Showing {records.length} submitted records · {totalStudents - submittedIds.size} not yet submitted
            </div>
          </div>
        )}
    </div>
  )
}
