import { useEffect, useState } from 'react'
import {
  CalendarCheck, CreditCard, MessageSquarePlus, AlertTriangle,
  Bell, ArrowRight, TrendingUp, Clock, Hash, Building2, BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import type { Student, AttendanceSummary, FeeRecord, StudentRequest, StudentProblem, Notice } from '@/types'
import clsx from 'clsx'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  if (h < 21) return 'Good Evening'
  return 'Good Night'
}

// ─── Mini chart components ────────────────────────────────────────────────────

function AttendanceChart({ presentDays, absentDays }: { presentDays: number; absentDays: number }) {
  const data = [
    { name: 'Present', value: presentDays, color: '#10b981' },
    { name: 'Absent',  value: absentDays,  color: '#ef4444' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-14 text-xs dark:text-zinc-700 text-zinc-300">No data yet</div>
  )

  return (
    <ResponsiveContainer width="100%" height={56}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={16} outerRadius={26}
          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', background: '#18191f', color: '#f4f4f5' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function FeesChart({ paid, pending }: { paid: number; pending: number }) {
  const data = [
    { name: 'Paid',    value: paid,    color: '#10b981' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-14 text-xs dark:text-zinc-700 text-zinc-300">No data</div>
  )

  return (
    <ResponsiveContainer width="100%" height={56}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={16} outerRadius={26}
          dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', background: '#18191f', color: '#f4f4f5' }}
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function RequestsChart({ requests }: { requests: StudentRequest[] }) {
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 }
  requests.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1 })
  const data = [
    { name: 'Pending',   value: counts.PENDING,   color: '#f59e0b' },
    { name: 'Approved',  value: counts.APPROVED,  color: '#10b981' },
    { name: 'Rejected',  value: counts.REJECTED,  color: '#ef4444' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-14 text-xs dark:text-zinc-700 text-zinc-300">No requests</div>
  )

  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart data={data} barCategoryGap="20%">
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', background: '#18191f', color: '#f4f4f5' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ProblemsChart({ problems }: { problems: StudentProblem[] }) {
  const counts: Record<string, number> = {}
  problems.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1 })
  const data = [
    { name: 'Pending',  value: counts.PENDING    ?? 0, color: '#f59e0b' },
    { name: 'Progress', value: counts.IN_PROGRESS ?? 0, color: '#3b6ef4' },
    { name: 'Resolved', value: counts.RESOLVED    ?? 0, color: '#10b981' },
  ].filter(d => d.value > 0)

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-14 text-xs dark:text-zinc-700 text-zinc-300">No problems</div>
  )

  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart data={data} barCategoryGap="20%">
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', background: '#18191f', color: '#f4f4f5' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Stat card with embedded chart ───────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, to, chart }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent: string; to: string
  chart?: React.ReactNode
}) {
  const { isDark } = useTheme()
  return (
    <Link to={to}
      className={clsx(
        'group relative rounded-2xl p-4 border transition-all duration-300 overflow-hidden flex flex-col hover:-translate-y-1',
        isDark
          ? 'bg-dark-800 border-white/8 hover:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
          : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
      )}>
      {/* Accent top line */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ background: accent }} />

      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}22`, border: `1px solid ${accent}33` }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
        <ArrowRight size={13}
          className={clsx('mt-0.5 transition-all group-hover:translate-x-0.5',
            isDark ? 'text-zinc-600 group-hover:text-zinc-300' : 'text-zinc-300 group-hover:text-zinc-600')} />
      </div>

      <p className={clsx('text-xl font-bold font-display leading-tight', isDark ? 'text-white' : 'text-zinc-900')}>{value}</p>
      <p className={clsx('text-xs font-semibold mt-0.5', isDark ? 'text-zinc-300' : 'text-zinc-700')}>{label}</p>
      {sub && <p className={clsx('text-[11px] mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-500')}>{sub}</p>}

      {/* Embedded mini-chart */}
      {chart && <div className="mt-3 -mx-1">{chart}</div>}
    </Link>
  )
}

// ─── Quick action ─────────────────────────────────────────────────────────────

function QuickAction({ to, label, icon: Icon, accent }: {
  to: string; label: string; icon: React.ElementType; accent: string
}) {
  const { isDark } = useTheme()
  return (
    <Link to={to}
      className={clsx('group flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1',
        isDark ? 'bg-dark-800 border-white/8 hover:border-white/15' : 'bg-white border-zinc-200 hover:border-zinc-400')}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <span className={clsx('text-xs font-semibold text-center leading-tight', isDark ? 'text-zinc-200' : 'text-zinc-700')}>{label}</span>
    </Link>
  )
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'tag tag-warning',
  APPROVED:   'tag tag-success',
  REJECTED:   'tag tag-error',
  CANCELLED:  'tag tag-neutral',
  IN_PROGRESS:'tag tag-info',
  RESOLVED:   'tag tag-success',
}
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
  CANCELLED: 'Cancelled', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved',
}
const REQUEST_TYPE_LABELS: Record<string, string> = {
  GOING_HOME: 'Going Home', OUTING: 'Outing', LEAVE: 'Leave',
  EMERGENCY_LEAVE: 'Emergency Leave', OTHER: 'Other',
  EMERGENCY: 'Emergency', IMPORTANT: 'Important', MODERATE: 'Moderate',
}
const PROBLEM_LABELS: Record<string, string> = {
  NO_WATER: 'No Water', ELECTRICITY: 'Electricity', CLEANING: 'Cleaning',
  PLUMBING: 'Plumbing', FURNITURE: 'Furniture', WIFI: 'Wi-Fi', OTHER: 'Other',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const { user }   = useAuth()
  const { isDark } = useTheme()
  const [student,    setStudent]    = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [fees,       setFees]       = useState<FeeRecord | null>(null)
  const [requests,   setRequests]   = useState<StudentRequest[]>([])
  const [allReqs,    setAllReqs]    = useState<StudentRequest[]>([])
  const [problems,   setProblems]   = useState<StudentProblem[]>([])
  const [allProbs,   setAllProbs]   = useState<StudentProblem[]>([])
  const [notices,    setNotices]    = useState<Notice[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sR, aR, fR, rR, rAllR, pR, pAllR, nR] = await Promise.allSettled([
          api.get('/students/me'),
          api.get('/students/me/attendance/summary'),
          api.get('/students/me/fees/current'),
          api.get('/students/me/requests?limit=3'),
          api.get('/requests?limit=50'),
          api.get('/students/me/problems?limit=3'),
          api.get('/problems?limit=50'),
          api.get('/notices?limit=3'),
        ])
        if (sR.status === 'fulfilled') setStudent(sR.value.data?.data)
        if (aR.status === 'fulfilled') setAttendance(aR.value.data?.data)
        if (fR.status === 'fulfilled') setFees(fR.value.data?.data)
        if (rR.status === 'fulfilled') setRequests(rR.value.data?.data?.data ?? [])
        if (rAllR.status === 'fulfilled') setAllReqs(rAllR.value.data?.data?.data ?? [])
        if (pR.status === 'fulfilled') setProblems(pR.value.data?.data?.data ?? [])
        if (pAllR.status === 'fulfilled') setAllProbs(pAllR.value.data?.data?.data ?? [])
        if (nR.status === 'fulfilled') setNotices(nR.value.data?.data?.data ?? [])
      } finally { setLoading(false) }
    }
    fetchDashboard()
  }, [])

  const card = clsx('rounded-2xl border p-5',
    isDark ? 'bg-dark-800 border-white/8' : 'bg-white border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)]')

  const sectionTitle = clsx('text-xs font-bold uppercase tracking-widest',
    isDark ? 'text-zinc-400' : 'text-zinc-500')

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className={clsx('h-36 rounded-2xl', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className={clsx('h-40 rounded-2xl', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />)}
      </div>
    </div>
  )

  const displayName = student?.name ?? user?.name ?? 'Student'
  const attPct = attendance?.percentage ?? 0
  const circumference = 2 * Math.PI * 26

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* ── Greeting banner ── */}
      <div className={clsx('relative rounded-2xl p-6 overflow-hidden border',
        isDark ? 'bg-dark-800 border-white/8' : 'bg-white border-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.05)]')}>
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #3b6ef4, #8b5cf6, #3b6ef4)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(59,110,244,0.06) 0%, transparent 70%)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <p className={clsx('text-xs font-medium flex items-center gap-1.5 mb-1', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              <Clock size={12} /> {getGreeting()}
            </p>
            <h1 className={clsx('text-2xl sm:text-3xl font-bold font-display mb-4', isDark ? 'text-white' : 'text-zinc-900')}>
              {displayName} 👋
            </h1>
            {/* Student identity — 4 fields, clear contrast */}
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {[
                { icon: Hash,      label: 'USN',           value: student?.usn ?? user?.usn },
                { icon: BookOpen,  label: 'Academic Year', value: student?.academicYear },
                { icon: Building2, label: 'Floor',         value: student?.floorNumber },
                { icon: Building2, label: 'Room',          value: student?.roomNumber },
              ].map(({ icon: Icon, label, value }) => value ? (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={12} className={isDark ? 'text-zinc-500' : 'text-zinc-400'} />
                  <span className={clsx('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>{label}:</span>
                  <span className={clsx('text-xs font-bold font-mono', isDark ? 'text-zinc-100' : 'text-zinc-800')}>{value}</span>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Attendance ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
              <svg width="68" height="68" className="-rotate-90">
                <circle cx="34" cy="34" r="26" fill="none" strokeWidth="5"
                  className={isDark ? 'stroke-white/8' : 'stroke-zinc-100'} />
                <circle cx="34" cy="34" r="26" fill="none" strokeWidth="5"
                  stroke={attPct >= 75 ? '#10b981' : attPct >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (attPct / 100) * circumference}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={clsx('text-sm font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>{attPct}%</span>
              </div>
            </div>
            <p className={clsx('text-[10px] font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Attendance</p>
          </div>
        </div>
      </div>

      {/* ── 4 Stat cards with charts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Attendance" to="/student/attendance"
          value={attendance ? `${attPct}%` : '—'} icon={CalendarCheck} accent="#3b6ef4"
          sub={attendance ? `${attendance.presentDays}P · ${attendance.absentDays}A` : 'No data'}
          chart={attendance && <AttendanceChart presentDays={attendance.presentDays} absentDays={attendance.absentDays} />}
        />
        <StatCard label="Fees Pending" to="/student/fees"
          value={fees ? `₹${fees.pendingAmount.toLocaleString('en-IN')}` : '—'} icon={CreditCard} accent="#ef4444"
          sub={fees?.dueDate ? `Due ${new Date(fees.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : undefined}
          chart={fees && fees.totalAmount > 0 && <FeesChart paid={fees.paidAmount} pending={fees.pendingAmount} />}
        />
        <StatCard label="Requests" to="/student/requests"
          value={String(allReqs.filter(r => r.status === 'PENDING').length)} icon={MessageSquarePlus} accent="#f59e0b"
          sub={`${allReqs.length} total`}
          chart={allReqs.length > 0 && <RequestsChart requests={allReqs} />}
        />
        <StatCard label="Problems" to="/student/problems"
          value={String(allProbs.filter(p => p.status !== 'RESOLVED').length)} icon={AlertTriangle} accent="#f97316"
          sub={`${allProbs.length} total`}
          chart={allProbs.length > 0 && <ProblemsChart problems={allProbs} />}
        />
      </div>

      {/* ── Quick actions ── */}
      <div className={card}>
        <h2 className={clsx(sectionTitle, 'mb-4 flex items-center gap-2')}>
          <TrendingUp size={13} /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction to="/student/attendance"  label="Mark Attendance"  icon={CalendarCheck}     accent="#3b6ef4" />
          <QuickAction to="/student/requests"    label="Raise Request"    icon={MessageSquarePlus} accent="#f59e0b" />
          <QuickAction to="/student/problems"    label="Raise a Problem"  icon={AlertTriangle}     accent="#f97316" />
          <QuickAction to="/student/fees"        label="View Fees"        icon={CreditCard}        accent="#ef4444" />
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={sectionTitle}>Recent Requests</h2>
            <Link to="/student/requests" className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-400 transition-colors font-medium">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className={clsx('text-xs text-center py-6', isDark ? 'text-zinc-600' : 'text-zinc-400')}>No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map(r => (
                <div key={r.id} className={clsx('flex items-center justify-between p-3 rounded-xl border',
                  isDark ? 'bg-dark-900 border-white/5' : 'bg-zinc-50 border-zinc-100')}>
                  <div>
                    <p className={clsx('text-xs font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      {REQUEST_TYPE_LABELS[r.type] ?? r.type}
                    </p>
                    <p className={clsx('text-[10px] mt-0.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={STATUS_COLORS[r.status] ?? 'tag tag-neutral'}>{STATUS_LABELS[r.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={sectionTitle}>Recent Problems</h2>
            <Link to="/student/problems" className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-400 transition-colors font-medium">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {problems.length === 0 ? (
            <p className={clsx('text-xs text-center py-6', isDark ? 'text-zinc-600' : 'text-zinc-400')}>No problems raised</p>
          ) : (
            <div className="space-y-2">
              {problems.map(p => (
                <div key={p.id} className={clsx('flex items-center justify-between p-3 rounded-xl border',
                  isDark ? 'bg-dark-900 border-white/5' : 'bg-zinc-50 border-zinc-100')}>
                  <div>
                    <p className={clsx('text-xs font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                      {PROBLEM_LABELS[p.category] ?? p.category}
                    </p>
                    <p className={clsx('text-[10px] mt-0.5', isDark ? 'text-zinc-600' : 'text-zinc-400')}>Room {p.roomNumber}</p>
                  </div>
                  <span className={STATUS_COLORS[p.status] ?? 'tag tag-neutral'}>{STATUS_LABELS[p.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Notices ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx(sectionTitle, 'flex items-center gap-2')}><Bell size={13} /> Important Notices</h2>
          <Link to="/student/notices" className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-400 transition-colors font-medium">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {notices.length === 0 ? (
          <p className={clsx('text-xs text-center py-6', isDark ? 'text-zinc-600' : 'text-zinc-400')}>No notices at this time</p>
        ) : (
          <div className="space-y-2">
            {notices.map(n => (
              <div key={n.id} className={clsx('flex items-start gap-3 p-3 rounded-xl border',
                isDark ? 'bg-dark-900 border-white/5' : 'bg-zinc-50 border-zinc-100')}>
                <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  n.priority === 'URGENT' ? 'bg-red-500' : n.priority === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500')} />
                <div className="min-w-0">
                  <p className={clsx('text-xs font-semibold truncate', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{n.title}</p>
                  <p className={clsx('text-[10px] mt-0.5 line-clamp-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{n.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
