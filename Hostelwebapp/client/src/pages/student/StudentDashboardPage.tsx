import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  CreditCard,
  MessageSquarePlus,
  AlertTriangle,
  Bell,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { Student, AttendanceSummary, FeeRecord, StudentRequest, StudentProblem, Notice } from '@/types'
import clsx from 'clsx'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  if (hour < 21) return 'Good Evening'
  return 'Good Night'
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  to,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 card-hover group flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        <ArrowRight size={15} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </Link>
  )
}

function QuickAction({
  to,
  label,
  icon: Icon,
  color,
}: {
  to: string
  label: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-card card-hover group"
    >
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{label}</span>
    </Link>
  )
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

const requestTypeLabels: Record<string, string> = {
  GOING_HOME: 'Going Home',
  OUTING: 'Outing',
  LEAVE: 'Leave',
  EMERGENCY_LEAVE: 'Emergency Leave',
  OTHER: 'Other',
}

const problemCategoryLabels: Record<string, string> = {
  NO_WATER: 'No Water',
  ELECTRICITY: 'Electricity',
  CLEANING: 'Cleaning',
  PLUMBING: 'Plumbing',
  FURNITURE: 'Furniture',
  WIFI: 'Wi-Fi',
  OTHER: 'Other',
}

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [fees, setFees] = useState<FeeRecord | null>(null)
  const [requests, setRequests] = useState<StudentRequest[]>([])
  const [problems, setProblems] = useState<StudentProblem[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sRes, aRes, fRes, rRes, pRes, nRes] = await Promise.allSettled([
          api.get('/students/me'),
          api.get('/students/me/attendance/summary'),
          api.get('/students/me/fees/current'),
          api.get('/students/me/requests?limit=3'),
          api.get('/students/me/problems?limit=3'),
          api.get('/notices?limit=3'),
        ])

        if (sRes.status === 'fulfilled') setStudent(sRes.value.data?.data)
        if (aRes.status === 'fulfilled') setAttendance(aRes.value.data?.data)
        if (fRes.status === 'fulfilled') setFees(fRes.value.data?.data)
        if (rRes.status === 'fulfilled') setRequests(rRes.value.data?.data?.data ?? [])
        if (pRes.status === 'fulfilled') setProblems(pRes.value.data?.data?.data ?? [])
        if (nRes.status === 'fulfilled') setNotices(nRes.value.data?.data?.data ?? [])
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const displayName = student?.name ?? user?.name ?? 'Student'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Greeting banner */}
      <div className="bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl p-6 text-white shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1 flex items-center gap-1.5">
              <Clock size={14} />
              {getGreeting()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {displayName} 👋
            </h1>
            <p className="text-primary-200 text-sm mt-1">Your Hostel Overview</p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <p className="text-xs text-primary-200">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {student && (
              <p className="text-xs text-primary-200 mt-1">
                {student.floorNumber} · Room {student.roomNumber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Student identity card — name, USN, academic year, floor, room only */}
      {student && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Student</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{student.name}</p>
          </div>
          <div className="w-px h-8 bg-slate-100 hidden sm:block" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">USN</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{student.usn}</p>
          </div>
          <div className="w-px h-8 bg-slate-100 hidden sm:block" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Academic Year</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{student.academicYear}</p>
          </div>
          <div className="w-px h-8 bg-slate-100 hidden sm:block" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Floor</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{student.floorNumber}</p>
          </div>
          <div className="w-px h-8 bg-slate-100 hidden sm:block" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Room</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{student.roomNumber}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Attendance"
          value={attendance ? `${attendance.percentage}%` : '—'}
          sub={attendance ? `${attendance.presentDays} present · ${attendance.absentDays} absent` : 'No data yet'}
          icon={CalendarCheck}
          color="bg-primary-500"
          to="/student/attendance"
        />
        <StatCard
          label="Fees Pending"
          value={fees ? `₹${fees.pendingAmount.toLocaleString('en-IN')}` : '—'}
          sub={fees?.dueDate ? `Due: ${new Date(fees.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : undefined}
          icon={CreditCard}
          color="bg-rose-500"
          to="/student/fees"
        />
        <StatCard
          label="Requests"
          value={requests.length > 0 ? String(requests.filter(r => r.status === 'PENDING').length) : '0'}
          sub="Pending requests"
          icon={MessageSquarePlus}
          color="bg-amber-500"
          to="/student/requests"
        />
        <StatCard
          label="Problems"
          value={problems.length > 0 ? String(problems.filter(p => p.status !== 'RESOLVED').length) : '0'}
          sub="Open issues"
          icon={AlertTriangle}
          color="bg-orange-500"
          to="/student/problems"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
        <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction to="/student/attendance" label="Mark Attendance" icon={CalendarCheck} color="bg-primary-500" />
          <QuickAction to="/student/requests" label="Raise Request" icon={MessageSquarePlus} color="bg-amber-500" />
          <QuickAction to="/student/problems" label="Raise a Problem" icon={AlertTriangle} color="bg-orange-500" />
          <QuickAction to="/student/fees" label="View Fees" icon={CreditCard} color="bg-rose-500" />
        </div>
      </div>

      {/* Two-col: recent requests + problems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Requests */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Recent Requests</h2>
            <Link to="/student/requests" className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {requests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {requestTypeLabels[req.type] ?? req.type}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', statusColors[req.status])}>
                    {statusLabels[req.status] ?? req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Problems */}
        <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Recent Problems</h2>
            <Link to="/student/problems" className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {problems.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No problems raised</p>
          ) : (
            <div className="space-y-2">
              {problems.map((prob) => (
                <div key={prob.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {problemCategoryLabels[prob.category] ?? prob.category}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Room {prob.roomNumber} · {new Date(prob.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', statusColors[prob.status])}>
                    {statusLabels[prob.status] ?? prob.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notices */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Bell size={15} className="text-primary-500" />
            Important Notices
          </h2>
          <Link to="/student/notices" className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-0.5">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {notices.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No notices at this time</p>
        ) : (
          <div className="space-y-2">
            {notices.map((notice) => (
              <div key={notice.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={clsx(
                  'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  notice.priority === 'URGENT' ? 'bg-red-500' :
                  notice.priority === 'HIGH' ? 'bg-orange-500' :
                  notice.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{notice.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{notice.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
