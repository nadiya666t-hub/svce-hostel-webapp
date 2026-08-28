import { useState, useEffect } from 'react'
import { GraduationCap, Home, CalendarCheck, CreditCard, CheckCircle2, XCircle, Clock, Loader2, Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { parentService, type ParentStudentData, type ParentFeeData, type ParentTodayAttendance, type ParentAttendanceRecord } from '@/services/parentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) }

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isDark } = useTheme()
  return <div className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm', className)}>{children}</div>
}

function SectionTitle({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  const { isDark } = useTheme()
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <h2 className={clsx('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>{title}</h2>
    </div>
  )
}

export default function ParentDashboardPage() {
  const { isDark } = useTheme()
  const [student,    setStudent]    = useState<ParentStudentData | null>(null)
  const [fees,       setFees]       = useState<ParentFeeData | null>(null)
  const [today,      setToday]      = useState<ParentTodayAttendance | null>(null)
  const [attHistory, setAttHistory] = useState<ParentAttendanceRecord[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      parentService.getStudent(),
      parentService.getFees(),
      parentService.getTodayAttendance(),
      parentService.getAttendanceHistory(1, 30),
    ]).then(([s, f, t, ah]) => {
      if (s.success && s.data)   setStudent(s.data)
      if (f.success)             setFees(f.data ?? null)
      if (t.success && t.data)   setToday(t.data)
      if (ah.success && ah.data) setAttHistory(ah.data.records)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-emerald-400" /></div>

  const feePaid             = fees ? fees.paidAmount >= fees.totalAmount : null
  const attendancePresent   = today?.attendance?.status === 'PRESENT' || today?.attendance?.status === 'LATE_PRESENT'
  const photoSrc = student?.photoUrl
    ? (student.photoUrl.startsWith('http') ? student.photoUrl : `/api/uploads${student.photoUrl.replace('/uploads', '')}`)
    : null

  const present      = attHistory.filter(r => r.status === 'PRESENT' || r.status === 'LATE_PRESENT').length
  const absent       = attHistory.filter(r => r.status === 'ABSENT').length
  const notSubmitted = attHistory.filter(r => r.status === 'NOT_SUBMITTED').length

  const attPie = [
    { name: 'Present',       value: present,      color: '#10b981' },
    { name: 'Absent',        value: absent,       color: '#ef4444' },
    { name: 'Not Submitted', value: notSubmitted, color: '#94a3b8' },
  ].filter(d => d.value > 0)

  const feePie = fees ? [
    { name: 'Paid',    value: fees.paidAmount,    color: '#10b981' },
    { name: 'Pending', value: fees.pendingAmount, color: '#f59e0b' },
  ].filter(d => d.value > 0) : []

  const ttStyle = { fontSize: '11px', borderRadius: '8px', border: 'none', background: isDark ? '#18191f' : '#fff', color: isDark ? '#f1f5f9' : '#0f172a' }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">

      {/* Header */}
      <div>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Parent Dashboard</h1>
        <p className={clsx('text-sm mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {student?.name ? `Monitoring ${student.name}'s hostel status` : 'SVCE Girls Hostel'}
        </p>
      </div>

      {/* Student overview card */}
      {student && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-white/10">
          <div className="flex items-center gap-5">
            {/* Photo */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0">
              {photoSrc ? (
                <img src={photoSrc} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-1">
                  <Camera size={20} className="text-white/40" />
                  <span className="text-[9px] text-white/40 text-center leading-tight">No photo</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{student.name}</h2>
              <p className="text-white/60 text-sm font-mono mt-0.5">{student.usn}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[student.academicYear, student.year, student.semester].filter(Boolean).map(v => (
                  <span key={v} className="bg-white/15 text-white text-xs font-medium px-2.5 py-1 rounded-full">{v}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { l: 'Course',  v: student.course ?? '—' },
              { l: 'Branch',  v: student.branch ?? '—' },
              { l: 'Floor',   v: student.floorNumber },
              { l: 'Room',    v: student.roomNumber },
            ].map(({ l, v }) => (
              <div key={l} className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wide">{l}</p>
                <p className="text-sm font-bold mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick status row */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/parent/attendance" className={clsx('rounded-2xl border p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5',
          attendancePresent ? 'bg-emerald-500/10 border-emerald-500/25' :
          today?.attendance ? 'bg-red-500/10 border-red-500/25' :
          isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
          {attendancePresent ? <CheckCircle2 size={22} className="text-emerald-400 shrink-0" /> :
           today?.attendance ? <XCircle size={22} className="text-red-400 shrink-0" /> :
           <Clock size={22} className={clsx('shrink-0', isDark ? 'text-slate-500' : 'text-slate-400')} />}
          <div className="min-w-0">
            <p className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-slate-600')}>Today's Attendance</p>
            <p className={clsx('text-sm font-bold mt-0.5 truncate',
              attendancePresent ? 'text-emerald-400' : today?.attendance ? 'text-red-400' : isDark ? 'text-slate-500' : 'text-slate-400')}>
              {today?.attendance ? (attendancePresent ? `Present · ${fmtTime(today.attendance.markedAt)}` : 'Absent') : 'Not Yet Marked'}
            </p>
          </div>
        </Link>

        <Link to="/parent/fees" className={clsx('rounded-2xl border p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5',
          feePaid === true ? 'bg-emerald-500/10 border-emerald-500/25' :
          feePaid === false ? 'bg-amber-500/10 border-amber-500/25' :
          isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
          <CreditCard size={22} className={clsx('shrink-0', feePaid === true ? 'text-emerald-400' : feePaid === false ? 'text-amber-400' : isDark ? 'text-slate-500' : 'text-slate-400')} />
          <div className="min-w-0">
            <p className={clsx('text-xs font-bold', isDark ? 'text-slate-300' : 'text-slate-600')}>Fee Status</p>
            <p className={clsx('text-sm font-bold mt-0.5', feePaid === true ? 'text-emerald-400' : feePaid === false ? 'text-amber-400' : isDark ? 'text-slate-500' : 'text-slate-400')}>
              {fees ? (feePaid ? 'Fully Paid' : `₹${fees.pendingAmount.toLocaleString('en-IN')} Due`) : '—'}
            </p>
          </div>
        </Link>
      </div>

      {/* Charts row */}
      {(attHistory.length > 0 || feePie.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Attendance donut */}
          {attHistory.length > 0 && (
            <Card>
              <SectionTitle icon={CalendarCheck} title="Attendance Overview" color="#10b981" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={attPie} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                      {attPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {attPie.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className={clsx('text-xs flex-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{d.name}</span>
                      <span className={clsx('text-xs font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{d.value}</span>
                    </div>
                  ))}
                  <div className={clsx('text-xs pt-1 border-t', isDark ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400')}>
                    Rate: <span className={clsx('font-bold', present >= attHistory.length * 0.75 ? 'text-emerald-500' : 'text-amber-500')}>
                      {attHistory.length ? Math.round((present / attHistory.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              <Link to="/parent/attendance" className="mt-3 text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-medium">
                View full history →
              </Link>
            </Card>
          )}

          {/* Fee donut */}
          {feePie.length > 0 && fees && (
            <Card>
              <SectionTitle icon={CreditCard} title="Fee Overview" color="#f59e0b" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={feePie} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                      {feePie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={ttStyle} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {feePie.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className={clsx('text-xs flex-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{d.name}</span>
                      <span className={clsx('text-xs font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>₹{feePie.find(p => p.name === d.name)!.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className={clsx('text-xs pt-1 border-t', isDark ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400')}>
                    Due: <span className="font-semibold">{fmtDate(fees.dueDate)}</span>
                  </div>
                </div>
              </div>
              <Link to="/parent/fees" className="mt-3 text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium">
                View fee details →
              </Link>
            </Card>
          )}
        </div>
      )}

      {/* Today attendance detail */}
      {today && (
        <Card>
          <SectionTitle icon={CalendarCheck} title="Today's Attendance" color="#10b981" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Window: <span className="font-mono font-semibold">{today.windowStart} – {today.windowEnd} IST</span>
              </p>
              <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Date: <span className="font-semibold">{fmtDate(today.date)}</span>
              </p>
            </div>
            <div className="text-right">
              {today.attendance ? (
                <>
                  <p className={clsx('text-base font-bold', attendancePresent ? 'text-emerald-400' : 'text-red-400')}>
                    {attendancePresent ? 'Present' : 'Absent'}
                  </p>
                  <p className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    at {fmtTime(today.attendance.markedAt)}
                  </p>
                </>
              ) : (
                <p className={clsx('text-base font-bold', isDark ? 'text-slate-500' : 'text-slate-400')}>Not Yet Marked</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Academic + Hostel */}
      {student && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <SectionTitle icon={GraduationCap} title="Academic" color="#8b5cf6" />
            <div className="space-y-3">
              {[{ l: 'Academic Year', v: student.academicYear }, { l: 'Year', v: student.year }, { l: 'Semester', v: student.semester }].map(({ l, v }) => (
                <div key={l} className="flex justify-between">
                  <span className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{l}</span>
                  <span className={clsx('text-xs font-semibold', isDark ? 'text-slate-200' : 'text-slate-700')}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle icon={Home} title="Hostel Room" color="#10b981" />
            <div className="space-y-3">
              {[{ l: 'Floor', v: student.floorNumber }, { l: 'Room', v: student.roomNumber }, { l: 'Status', v: student.status }].map(({ l, v }) => (
                <div key={l} className="flex justify-between">
                  <span className={clsx('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>{l}</span>
                  <span className={clsx('text-xs font-semibold', isDark ? 'text-slate-200' : 'text-slate-700')}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
