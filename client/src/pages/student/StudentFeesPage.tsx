import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, TrendingDown, Receipt } from 'lucide-react'
import { studentService } from '@/services/studentService'
import { useTheme } from '@/hooks/useTheme'
import type { FeeRecord } from '@/types'
import clsx from 'clsx'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

export default function StudentFeesPage() {
  const [fees, setFees]   = useState<FeeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const { isDark } = useTheme()

  useEffect(() => {
    studentService.getCurrentFees()
      .then(r => { if (r.success) setFees(r.data ?? null) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4 animate-pulse">
      <div className={clsx('h-40 rounded-2xl', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />
      <div className={clsx('h-24 rounded-2xl', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />
    </div>
  )

  const paidPct    = fees ? Math.round((fees.paidAmount / fees.totalAmount) * 100) : 0
  const isOverdue  = fees ? new Date(fees.dueDate) < new Date() && fees.pendingAmount > 0 : false
  const circumference = 2 * Math.PI * 40

  const card = clsx('rounded-2xl border', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-4">
      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
          isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
          <CreditCard size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Fees</h1>
          <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Fee details and payment history</p>
        </div>
      </div>

      {!fees ? (
        <div className={clsx(card, 'p-12 text-center')}>
          <CreditCard size={36} className={clsx('mx-auto mb-3', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
          <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-500' : 'text-zinc-500')}>No fee record found</p>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className={clsx('rounded-2xl border p-6 relative overflow-hidden', isDark ? 'bg-dark-900 border-white/5' : 'bg-white border-zinc-200')}>
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #3b6ef4, transparent)' }} />

            <div className="flex items-start gap-6">
              {/* Ring chart */}
              <div className="relative shrink-0">
                <svg width="92" height="92" className="-rotate-90">
                  <circle cx="46" cy="46" r="40" fill="none" strokeWidth="6"
                    className={isDark ? 'stroke-white/8' : 'stroke-zinc-100'} />
                  <circle cx="46" cy="46" r="40" fill="none" strokeWidth="6"
                    stroke={paidPct >= 75 ? '#10b981' : paidPct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (paidPct / 100) * circumference}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={clsx('text-base font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>{paidPct}%</span>
                  <span className={clsx('text-[9px] font-mono', isDark ? 'text-zinc-600' : 'text-zinc-400')}>paid</span>
                </div>
              </div>

              {/* Amounts */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className={clsx('text-[10px] uppercase tracking-widest font-mono', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Academic Year</p>
                  <p className={clsx('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{fees.academicYear}</p>
                </div>
                {[
                  { label: 'Total Fee', value: fmtINR(fees.totalAmount), color: isDark ? 'text-zinc-300' : 'text-zinc-700' },
                  { label: 'Paid', value: fmtINR(fees.paidAmount), color: 'text-emerald-500' },
                  { label: 'Pending', value: fmtINR(fees.pendingAmount), color: fees.pendingAmount > 0 ? 'text-red-400' : 'text-emerald-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className={clsx('text-xs', isDark ? 'text-zinc-600' : 'text-zinc-400')}>{s.label}</span>
                    <span className={clsx('text-sm font-bold font-mono', s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className={clsx('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/8' : 'bg-zinc-100')}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${paidPct}%`, background: 'linear-gradient(90deg, #10b981, #3b6ef4)' }} />
              </div>
              <p className={clsx('text-[10px] font-mono mt-1.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                Due: {fmtDate(fees.dueDate)}
              </p>
            </div>
          </div>

          {/* Status banner */}
          {fees.pendingAmount === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border p-4 bg-emerald-500/8 border-emerald-500/20">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">All Fees Paid</p>
                <p className="text-xs text-emerald-600 mt-0.5">Your payment is complete for {fees.academicYear}.</p>
              </div>
            </div>
          ) : isOverdue ? (
            <div className="flex items-center gap-3 rounded-2xl border p-4 bg-red-500/8 border-red-500/20">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-400">Payment Overdue</p>
                <p className="text-xs text-red-500 mt-0.5">{fmtINR(fees.pendingAmount)} was due on {fmtDate(fees.dueDate)}.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border p-4 bg-amber-500/8 border-amber-500/20">
              <TrendingDown size={18} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-400">Balance Due: {fmtINR(fees.pendingAmount)}</p>
                <p className="text-xs text-amber-600 mt-0.5">Please clear the balance before {fmtDate(fees.dueDate)}.</p>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className={clsx(card, 'p-5')}>
            <h2 className={clsx('text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              <Receipt size={12} /> Payment History
            </h2>
            {fees.payments.length === 0 ? (
              <p className={clsx('text-xs text-center py-6', isDark ? 'text-zinc-700' : 'text-zinc-400')}>No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {fees.payments.map(p => {
                  const isSuccess = p.status === 'SUCCESS'
                  return (
                    <div key={p.id} className={clsx('flex items-center justify-between gap-3 p-3 rounded-xl border',
                      isDark ? 'bg-dark-800 border-white/5' : 'bg-zinc-50 border-zinc-100')}>
                      <div className="min-w-0">
                        <p className={clsx('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{fmtINR(p.amount)}</p>
                        <p className={clsx('text-[10px] font-mono mt-0.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>{fmtDate(p.date)}</p>
                        <p className={clsx('text-[10px] font-mono', isDark ? 'text-zinc-700' : 'text-zinc-400')}>{p.reference}</p>
                      </div>
                      <span className={clsx('tag shrink-0', isSuccess ? 'tag-success' : p.status === 'PENDING' ? 'tag-warning' : 'tag-error')}>
                        {isSuccess ? 'Paid' : p.status === 'PENDING' ? 'Pending' : 'Failed'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p className={clsx('text-xs text-center font-mono', isDark ? 'text-zinc-700' : 'text-zinc-400')}>
            Online payment coming soon · Contact hostel office for payment
          </p>
        </>
      )}
    </div>
  )
}
