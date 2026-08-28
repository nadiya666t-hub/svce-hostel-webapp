import { useState, useEffect } from 'react'
import { CreditCard, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmt(iso:string){ return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }

export default function WardenFeesPage() {
  const { isDark } = useTheme()
  const [data,    setData]    = useState<Record<string,unknown>|null>(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('ALL')

  useEffect(()=>{
    wardenService.getFeeOverview().then(r=>{ if(r.success) setData(r.data) }).finally(()=>setLoading(false))
  },[])

  const summary = data?.summary as Record<string,number>|undefined
  const allFees = (data?.fees as Record<string,unknown>[]|undefined)??[]

  const fees = allFees.filter(f=>{
    const s=f.student as Record<string,unknown>
    const matchSearch = !search || (s.name as string).toLowerCase().includes(search.toLowerCase()) || (s.usn as string).toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter==='ALL' || f.status===filter
    return matchSearch && matchFilter
  })

  const pieData = summary ? [
    {name:'Fully Paid', value:summary.fullyPaid,  color:'#10b981'},
    {name:'Pending',    value:summary.hasPending, color:'#f59e0b'},
  ] : []

  const tt = {fontSize:'11px',borderRadius:'8px',border:'none',background:isDark?'#18191f':'#fff',color:isDark?'#f1f5f9':'#0f172a'}

  if(loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-accent-400"/></div>

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-emerald-500/15 border border-emerald-500/20':'bg-emerald-50 border border-emerald-200')}>
          <CreditCard size={18} className={isDark?'text-emerald-400':'text-emerald-600'}/>
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Fee Overview</h1>
          <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{data?.academicYear as string}</p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Amounts */}
          <div className={clsx('rounded-2xl border p-5',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3',isDark?'text-slate-400':'text-slate-500')}>Fee Summary</p>
            <div className="space-y-2">
              {[
                {l:'Total Amount',v:`₹${summary.totalAmount.toLocaleString('en-IN')}`,c:isDark?'text-slate-200':'text-slate-800'},
                {l:'Total Paid',v:`₹${summary.totalPaid.toLocaleString('en-IN')}`,c:'text-emerald-500'},
                {l:'Total Pending',v:`₹${summary.totalPending.toLocaleString('en-IN')}`,c:summary.totalPending>0?'text-amber-500':'text-emerald-500'},
              ].map(({l,v,c})=>(
                <div key={l} className="flex justify-between">
                  <span className={clsx('text-sm',isDark?'text-slate-400':'text-slate-500')}>{l}</span>
                  <span className={clsx('text-sm font-bold',c)}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Pie */}
          <div className={clsx('rounded-2xl border p-5',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3',isDark?'text-slate-400':'text-slate-500')}>Student Status</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={90} height={90}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                  {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie><Tooltip contentStyle={tt}/></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map(d=>(
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:d.color}}/>
                    <span className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{d.name}</span>
                    <span className={clsx('text-xs font-bold ml-auto',isDark?'text-slate-200':'text-slate-800')}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className={clsx('absolute left-3 top-1/2 -translate-y-1/2',isDark?'text-slate-500':'text-slate-400')}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…" className="input-dark w-full pl-8 text-sm"/>
        </div>
        {['ALL','PAID','PENDING'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={clsx('px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
              filter===f?'bg-accent-600 text-white':isDark?'bg-dark-800 border border-white/8 text-slate-300':'bg-white border border-slate-200 text-slate-600')}>
            {f==='ALL'?'All':f==='PAID'?'Fully Paid':'Has Pending'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={clsx('rounded-2xl border overflow-hidden',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={clsx('border-b text-xs uppercase tracking-wide',isDark?'border-white/5 text-slate-500':'border-slate-100 text-slate-400')}>
                {['Student','USN','Floor·Room','Total','Paid','Pending','Due Date','Status'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={clsx('divide-y',isDark?'divide-white/5':'divide-slate-50')}>
              {fees.map(f=>{
                const fee=f as Record<string,unknown>
                const s=fee.student as Record<string,unknown>
                const isPaid=fee.status==='PAID'
                return (
                  <tr key={fee.id as string} className={clsx('transition-colors',isDark?'hover:bg-dark-800':'hover:bg-slate-50')}>
                    <td className={clsx('px-4 py-3 font-semibold',isDark?'text-slate-200':'text-slate-800')}>{s.name as string}</td>
                    <td className={clsx('px-4 py-3 font-mono text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</td>
                    <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-400':'text-slate-500')}>{s.floor as string}·{s.room as string}</td>
                    <td className={clsx('px-4 py-3 text-xs font-semibold',isDark?'text-slate-300':'text-slate-700')}>₹{Number(fee.totalAmount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-xs text-emerald-500 font-semibold">₹{Number(fee.paidAmount).toLocaleString('en-IN')}</td>
                    <td className={clsx('px-4 py-3 text-xs font-semibold',Number(fee.pendingAmount)>0?'text-amber-500':'text-emerald-500')}>₹{Number(fee.pendingAmount).toLocaleString('en-IN')}</td>
                    <td className={clsx('px-4 py-3 text-xs',isDark?'text-slate-400':'text-slate-500')}>{fmt(fee.dueDate as string)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('flex items-center gap-1 text-xs font-semibold',isPaid?'text-emerald-500':'text-amber-500')}>
                        {isPaid?<CheckCircle2 size={12}/>:<AlertCircle size={12}/>} {isPaid?'Paid':'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {fees.length===0 && <tr><td colSpan={8} className={clsx('px-4 py-10 text-center text-sm',isDark?'text-slate-500':'text-slate-400')}>No records.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
