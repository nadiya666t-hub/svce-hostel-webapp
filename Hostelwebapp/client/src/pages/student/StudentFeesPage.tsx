import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle2, Clock, AlertCircle, TrendingDown, Receipt } from 'lucide-react'
import { studentService } from '@/services/studentService'
import type { FeeRecord } from '@/types'
import clsx from 'clsx'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    SUCCESS: { label: 'Paid',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
    PENDING: { label: 'Pending', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: Clock },
    FAILED:  { label: 'Failed',  color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         icon: AlertCircle },
  }
  const m = map[status] ?? map.PENDING
  const Icon = m.icon
  return (
    <span className={clsx('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border', m.bg, m.color)}>
      <Icon size={11} /> {m.label}
    </span>
  )
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentService.getCurrentFees()
      .then(r => { if (r.success) setFees(r.data ?? null) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-4 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-2xl" />
      <div className="h-24 bg-slate-100 rounded-2xl" />
      <div className="h-48 bg-slate-100 rounded-2xl" />
    </div>
  )

  const paidPct = fees ? Math.round((fees.paidAmount / fees.totalAmount) * 100) : 0
  const isOverdue = fees ? new Date(fees.dueDate) < new Date() && fees.pendingAmount > 0 : false

  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <CreditCard size={20} className="text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fees</h1>
          <p className="text-sm text-slate-400">Fee details and payment history</p>
        </div>
      </div>

      {!fees ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-12 text-center">
          <CreditCard size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No fee record found</p>
          <p className="text-xs text-slate-400 mt-1">Contact the hostel office for details.</p>
        </div>
      ) : (
        <>
          {/* Overview card */}
          <div className="bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl p-6 text-white shadow-glow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-primary-200 text-xs font-medium uppercase tracking-wide">Academic Year</p>
                <p className="text-base font-bold mt-0.5">{fees.academicYear}</p>
              </div>
              {isOverdue && (
                <span className="bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">Overdue</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total Fee', value: fmtINR(fees.totalAmount) },
                { label: 'Paid', value: fmtINR(fees.paidAmount) },
                { label: 'Pending', value: fmtINR(fees.pendingAmount) },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-base font-bold">{s.value}</p>
                  <p className="text-primary-200 text-[11px] font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-primary-200 mb-1.5">
                <span>Payment Progress</span><span>{paidPct}% paid</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <p className="text-primary-200 text-xs mt-3">
              Due Date: <span className="text-white font-semibold">{fmtDate(fees.dueDate)}</span>
            </p>
          </div>

          {/* Status banner */}
          {fees.pendingAmount === 0 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">All Fees Paid</p>
                <p className="text-xs text-emerald-600 mt-0.5">Your fee payment is complete for {fees.academicYear}.</p>
              </div>
            </div>
          ) : isOverdue ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">Payment Overdue</p>
                <p className="text-xs text-red-600 mt-0.5">{fmtINR(fees.pendingAmount)} was due on {fmtDate(fees.dueDate)}. Please contact the office.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <TrendingDown size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Balance Due: {fmtINR(fees.pendingAmount)}</p>
                <p className="text-xs text-amber-600 mt-0.5">Please clear the balance before {fmtDate(fees.dueDate)}.</p>
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Receipt size={15} className="text-primary-500" /> Payment History
            </h2>
            {fees.payments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {fees.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{fmtINR(p.amount)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(p.date)}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{p.reference}</p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">Online payment functionality coming soon. Visit the hostel office for payment.</p>
        </>
      )}
    </div>
  )
}
