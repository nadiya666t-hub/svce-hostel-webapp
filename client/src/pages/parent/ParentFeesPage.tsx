import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { parentService, type ParentFeeData } from '@/services/parentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtAmt(n: number) { return `₹${n.toLocaleString('en-IN')}` }

export default function ParentFeesPage() {
  const { isDark } = useTheme()
  const [fees, setFees]     = useState<ParentFeeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parentService.getFees().then(res => { if (res.success) setFees(res.data ?? null) }).finally(() => setLoading(false))
  }, [])

  const paid = fees ? fees.paidAmount >= fees.totalAmount : null
  const ttStyle = { fontSize: '11px', borderRadius: '8px', border: 'none', background: isDark ? '#18191f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }

  const pieData = fees ? [
    { name: 'Paid',    value: fees.paidAmount,    color: '#10b981' },
    { name: 'Pending', value: fees.pendingAmount, color: '#f59e0b' },
  ].filter(d => d.value > 0) : []

  const barData = fees ? [
    { name: 'Total',   value: fees.totalAmount },
    { name: 'Paid',    value: fees.paidAmount },
    { name: 'Pending', value: fees.pendingAmount },
  ] : []

  const card = clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-amber-500/15 border border-amber-500/20' : 'bg-amber-50 border border-amber-200')}>
          <CreditCard size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Fee Details</h1>
          <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Hostel fee status</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-amber-400" /></div>
      ) : !fees ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
          <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>No fee record found for current academic year.</p>
        </div>
      ) : (
        <>
          {/* Status banner */}
          <div className={clsx('rounded-2xl border p-5 flex items-center gap-4',
            paid ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-amber-500/10 border-amber-500/25')}>
            {paid ? <CheckCircle2 size={28} className="text-emerald-400 shrink-0" /> : <AlertCircle size={28} className="text-amber-400 shrink-0" />}
            <div>
              <p className={clsx('text-base font-bold', paid ? 'text-emerald-400' : 'text-amber-400')}>{paid ? 'Fees Fully Paid' : 'Fees Pending'}</p>
              <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {fees.academicYear} · Due: {fmtDate(fees.dueDate)}
              </p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Donut */}
            {pieData.length > 0 && (
              <div className={card}>
                <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>Fee Breakdown</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={ttStyle} formatter={(v: number) => [fmtAmt(v), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className={clsx('text-xs', isDark ? 'text-slate-300' : 'text-slate-600')}>{d.name}</span>
                        <span className={clsx('text-xs font-bold ml-auto', isDark ? 'text-slate-200' : 'text-slate-800')}>{fmtAmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bar chart */}
            <div className={card}>
              <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>Fee Overview</p>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={barData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={ttStyle} formatter={(v: number) => [fmtAmt(v), '']} />
                  <Bar dataKey="value" radius={4 as unknown as [number,number,number,number]}>
                    {barData.map((_d, i) => <Cell key={i} fill={i === 0 ? '#3b6ef4' : i === 1 ? '#10b981' : '#f59e0b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Amounts */}
          <div className={card}>
            <div className="space-y-3">
              {[
                { l: 'Total Amount', v: fmtAmt(fees.totalAmount),    c: isDark ? 'text-slate-200' : 'text-slate-800' },
                { l: 'Amount Paid',  v: fmtAmt(fees.paidAmount),     c: 'text-emerald-500' },
                { l: 'Pending',      v: fmtAmt(fees.pendingAmount),  c: fees.pendingAmount > 0 ? 'text-amber-500' : 'text-emerald-500' },
              ].map(({ l, v, c }) => (
                <div key={l} className={clsx('flex justify-between items-center py-2.5 border-b last:border-0', isDark ? 'border-white/5' : 'border-slate-100')}>
                  <span className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>{l}</span>
                  <span className={clsx('text-sm font-bold', c)}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment history */}
          {fees.payments.length > 0 && (
            <div className={card}>
              <p className={clsx('text-xs font-bold uppercase tracking-widest mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>Payment History</p>
              <div className="space-y-2">
                {fees.payments.map(p => (
                  <div key={p.id} className={clsx('flex items-center justify-between text-sm rounded-xl px-3 py-2.5', isDark ? 'bg-dark-800' : 'bg-slate-50')}>
                    <div>
                      <p className={clsx('font-semibold', isDark ? 'text-slate-200' : 'text-slate-800')}>{fmtAmt(p.amount)}</p>
                      <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{fmtDate(p.date)} · {p.reference}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
