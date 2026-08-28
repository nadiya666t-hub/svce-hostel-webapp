import { useState, useEffect, useCallback } from 'react'
import { Clock, Plus, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function WardenWindowsPage() {
  const { isDark } = useTheme()
  const today = new Date(Date.now()+5.5*60*60*1000).toISOString().slice(0,10)
  const [windows, setWindows] = useState<Record<string,unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [date,    setDate]    = useState(today)
  const [start,   setStart]   = useState('20:30')
  const [end,     setEnd]     = useState('20:40')
  const [saving,  setSaving]  = useState(false)
  const [autoMsg, setAutoMsg] = useState<string|null>(null)
  const [error,   setError]   = useState('')

  const load = useCallback(async()=>{
    setLoading(true)
    try { const r=await wardenService.getDefaultWindows(); if(r.success) setWindows(r.data) }
    finally { setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  async function handleCreate(e:React.FormEvent){
    e.preventDefault(); setError('')
    setSaving(true)
    try {
      const r = await wardenService.createDefaultWindow({date,startTime:start,endTime:end})
      if(r.success){ load(); setDate(today); setStart('20:30'); setEnd('20:40') }
      else setError(r.message??'Failed.')
    } catch(e2:unknown){ setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message??'Failed.') }
    finally { setSaving(false) }
  }

  async function handleAutoCreate(){
    setAutoMsg(null)
    const r = await wardenService.autoCreateTodayWindow()
    if(r.success) { setAutoMsg(r.created?`Created window for today (${r.data.startTime}–${r.data.endTime})`:'Today\'s window already exists.'); load() }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-accent-600/15 border border-accent-600/20':'bg-blue-50 border border-blue-200')}>
            <Clock size={18} className={isDark?'text-accent-400':'text-blue-600'}/>
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Attendance Windows</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Manage daily attendance time windows</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAutoCreate} className={clsx('px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            <RefreshCw size={13}/> Auto-create Today
          </button>
        </div>
      </div>

      {autoMsg && (
        <div className={clsx('flex items-center gap-2 rounded-xl p-3 mb-4 text-sm',isDark?'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400':'bg-emerald-50 border border-emerald-200 text-emerald-700')}>
          <CheckCircle2 size={14}/> {autoMsg}
        </div>
      )}

      {/* Create form */}
      <div className={clsx('rounded-2xl border p-5 mb-5',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
        <h2 className={clsx('text-sm font-bold mb-4',isDark?'text-slate-200':'text-slate-800')}>Create / Override Window</h2>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="sm:col-span-3">
            <button type="submit" disabled={saving} className="btn-accent text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50">
              {saving?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Create Window
            </button>
          </div>
        </form>
      </div>

      {/* Note about auto-creation */}
      <div className={clsx('rounded-xl p-3 mb-5 text-xs flex items-start gap-2',isDark?'bg-accent-600/10 border border-accent-600/20 text-accent-300':'bg-blue-50 border border-blue-200 text-blue-700')}>
        <Clock size={13} className="shrink-0 mt-0.5"/>
        The server automatically creates today's default window (8:30–8:40 PM) at 8:00 PM IST every day. Use this page to create windows in advance or change the timing for specific dates.
      </div>

      {/* Recent windows */}
      <h3 className={clsx('text-xs font-bold uppercase tracking-widest mb-3',isDark?'text-slate-500':'text-slate-400')}>Recent Windows (last 30)</h3>
      {loading ? <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-accent-400"/></div>
        : windows.length===0 ? (
          <div className={clsx('rounded-2xl border p-10 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No windows yet. Use Auto-create Today to create one.</p>
          </div>
        ) : (
          <div className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
            <table className="w-full text-sm">
              <thead>
                <tr className={clsx('border-b text-xs uppercase tracking-wide',isDark?'border-white/5 text-slate-500':'border-slate-100 text-slate-400')}>
                  {['Date','Time Window','Status','Created'].map(h=><th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className={clsx('divide-y',isDark?'divide-white/5':'divide-slate-50')}>
                {windows.map(w=>{
                  const win=w as Record<string,unknown>
                  const isActive=win.windowStatus==='ACTIVE'
                  return (
                    <tr key={win.id as string} className={clsx(isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                      <td className={clsx('px-4 py-3 font-semibold',isDark?'text-slate-200':'text-slate-800')}>{fmt(win.date as string)}</td>
                      <td className={clsx('px-4 py-3 font-mono text-xs',isDark?'text-slate-300':'text-slate-700')}>{win.startTime as string} – {win.endTime as string} IST</td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',isActive?'bg-emerald-500/10 text-emerald-500':'bg-slate-500/10 text-slate-400')}>{win.windowStatus as string}</span>
                      </td>
                      <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-500':'text-slate-400')}>{fmt(win.createdAt as string)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
