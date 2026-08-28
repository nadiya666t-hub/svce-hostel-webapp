import { useState, useEffect, useCallback } from 'react'
import { DoorOpen, Loader2, RefreshCw, Search } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmtTime(iso:string){ return new Date(iso).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true}) }

export default function WardenEntryExitPage() {
  const { isDark } = useTheme()
  const today = new Date(Date.now()+5.5*60*60*1000).toISOString().slice(0,10)
  const [date,   setDate]   = useState(today)
  const [search, setSearch] = useState('')
  const [data,   setData]   = useState<Record<string,unknown>|null>(null)
  const [loading,setLoading]= useState(true)

  const load = useCallback(async(d:string,q='')=>{
    setLoading(true)
    try {
      const r = await wardenService.getEntryExit({date:d, search:q||undefined})
      if(r.success) setData(r.data)
    } finally { setLoading(false) }
  },[])

  useEffect(()=>{ load(date) },[date, load])

  const records = ((data?.records as Record<string,unknown>[]|undefined)??[]).filter(r=>{
    if(!search) return true
    const s=r.student as Record<string,unknown>
    return (s.name as string).toLowerCase().includes(search.toLowerCase())||(s.usn as string).toLowerCase().includes(search.toLowerCase())
  })

  const inside  = records.filter(r=>r.status==='IN').length
  const outside = records.filter(r=>r.status==='OUT').length

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-blue-500/15 border border-blue-500/20':'bg-blue-50 border border-blue-200')}>
            <DoorOpen size={18} className={isDark?'text-blue-400':'text-blue-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Entry / Exit</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Student hostel movement records</p>
          </div>
        </div>
        <button onClick={()=>load(date,search)} className={clsx('p-2 rounded-xl',isDark?'text-slate-500 hover:text-slate-300 hover:bg-dark-700':'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}>
          <RefreshCw size={16} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {l:'Total Records',v:records.length,c:isDark?'text-slate-100':'text-slate-800'},
            {l:'Inside',v:inside,c:'text-emerald-500'},
            {l:'Outside',v:outside,c:'text-amber-500'},
          ].map(({l,v,c})=>(
            <div key={l} className={clsx('rounded-2xl border p-4 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
              <p className={clsx('text-2xl font-bold',c)}>{v}</p>
              <p className={clsx('text-xs font-semibold mt-0.5',isDark?'text-slate-500':'text-slate-400')}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className={clsx('px-3 py-2 rounded-xl border text-sm outline-none',isDark?'bg-dark-800 border-white/8 text-slate-200':'bg-white border-slate-200 text-slate-800')}/>
        <div className="relative flex-1">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2',isDark?'text-slate-500':'text-slate-400')}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…" className="input-dark w-full pl-8 text-sm"/>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-blue-400"/></div>
        : (
          <div className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={clsx('border-b text-xs uppercase tracking-wide',isDark?'border-white/5 text-slate-500':'border-slate-100 text-slate-400')}>
                    {['Student','USN','Floor·Room','Entry Time','Exit Time','Status','Note'].map(h=>(
                      <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={clsx('divide-y',isDark?'divide-white/5':'divide-slate-50')}>
                  {records.map(rec=>{
                    const r=rec as Record<string,unknown>
                    const s=r.student as Record<string,unknown>
                    const isIn=r.status==='IN'
                    return (
                      <tr key={r.id as string} className={clsx('transition-colors',isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                        <td className={clsx('px-4 py-3 font-semibold',isDark?'text-slate-200':'text-slate-800')}>{s.name as string}</td>
                        <td className={clsx('px-4 py-3 font-mono text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</td>
                        <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.floor as string}·{s.room as string}</td>
                        <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-400':'text-slate-500')}>{r.entryTime?fmtTime(r.entryTime as string):'—'}</td>
                        <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-400':'text-slate-500')}>{r.exitTime?fmtTime(r.exitTime as string):'—'}</td>
                        <td className="px-4 py-3">
                          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',isIn?'bg-emerald-500/10 text-emerald-500':'bg-amber-500/10 text-amber-500')}>{isIn?'Inside':'Outside'}</span>
                        </td>
                        <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-500':'text-slate-400')}>{r.note as string||'—'}</td>
                      </tr>
                    )
                  })}
                  {records.length===0 && <tr><td colSpan={7} className={clsx('px-4 py-10 text-center text-sm',isDark?'text-slate-500':'text-slate-400')}>No records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  )
}
