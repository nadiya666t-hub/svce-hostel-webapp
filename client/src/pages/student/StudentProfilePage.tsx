import { useEffect, useState } from 'react'
import {
  User, Building2, BookOpen, Hash, Phone, Mail,
  Heart, MapPin, Users, GraduationCap, Info, Shield,
} from 'lucide-react'
import api from '@/services/api'
import type { Student } from '@/types'
import clsx from 'clsx'

function FieldRow({
  label,
  value,
  icon: Icon,
  system = false,
  className,
}: {
  label: string
  value?: string | number | null
  icon: React.ElementType
  system?: boolean
  className?: string
}) {
  if (value == null || value === '' || value === 'â€”') return null
  return (
    <div className={clsx('flex items-center gap-4 px-5 py-3.5', className)}>
      <div className="w-8 h-8 rounded-lg bg-accent-600/12 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-accent-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] dark:text-zinc-500 text-zinc-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mt-0.5">{value}</p>
      </div>
      {system && (
        <span className="text-[10px] dark:text-zinc-500 text-zinc-400 dark:bg-white/8 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">System</span>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="dark:bg-dark-900 bg-white rounded-2xl border dark:border-white/5 border-zinc-200 overflow-hidden">
      <div className="px-5 py-3 border-b dark:border-white/5 border-zinc-100 flex items-center gap-2">
        <Icon size={14} className="text-accent-400" />
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="divide-y divide-slate-50">
        {children}
      </div>
    </div>
  )
}

function formatGender(g?: string) {
  if (!g || g === 'NOT_SPECIFIED') return null
  return g.charAt(0) + g.slice(1).toLowerCase()
}

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/students/me')
      .then(res => setStudent(res.data?.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">My Profile</h1>
        <p className="text-sm dark:text-zinc-500 text-zinc-400 mt-1">Your personal and academic details</p>
      </div>

      {/* Avatar card */}
      <div className="bg-gradient-to-br from-accent-700 to-dark-800 rounded-2xl p-6 text-white ">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold">{student?.name?.charAt(0) ?? 'S'}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold truncate">{student?.name ?? 'â€”'}</h2>
            <p className="text-accent-300 text-sm mt-0.5 font-mono">{student?.usn ?? 'â€”'}</p>
            <p className="text-accent-300 text-xs mt-1">
              {student?.floorNumber} Â· Room {student?.roomNumber}
            </p>
            {student?.course && (
              <p className="text-accent-300 text-xs mt-0.5">
                {student.course} Â· {student.branch}
              </p>
            )}
          </div>
        </div>

        {/* Academic badge row */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            student?.year,
            student?.semester,
            student?.academicYear,
          ].filter(Boolean).map((v) => (
            <span key={v} className="bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full">
              {v}
            </span>
          ))}
          {student?.status && student.status !== 'ACTIVE' && (
            <span className="bg-red-400/20 text-red-100 text-xs font-medium px-3 py-1 rounded-full">
              {student.status}
            </span>
          )}
        </div>
      </div>

      {/* Identity */}
      <Section title="Identity" icon={User}>
        <FieldRow label="Full Name"      value={student?.name}          icon={User}    />
        <FieldRow label="USN"            value={student?.usn}           icon={Hash}    system />
        <FieldRow label="Email"          value={student?.email}         icon={Mail}    />
        <FieldRow label="Phone"          value={student?.phone}         icon={Phone}   />
        <FieldRow label="Gender"         value={formatGender(student?.gender)} icon={User} />
        <FieldRow label="Blood Group"    value={student?.bloodGroup}    icon={Heart}   />
      </Section>

      {/* Academic */}
      <Section title="Academic Details" icon={GraduationCap}>
        <FieldRow label="Academic Year"  value={student?.academicYear}  icon={BookOpen} system />
        <FieldRow label="Year"           value={student?.year}          icon={BookOpen} system />
        <FieldRow label="Semester"       value={student?.semester}      icon={BookOpen} system />
        <FieldRow label="Course"         value={student?.course}        icon={GraduationCap} system />
        <FieldRow label="Branch"         value={student?.branch}        icon={GraduationCap} system />
        <FieldRow label="Admission Year" value={student?.admissionYear} icon={BookOpen} system />
      </Section>

      {/* Hostel */}
      <Section title="Hostel Accommodation" icon={Building2}>
        <FieldRow label="Floor"          value={student?.floorNumber}   icon={Building2} system />
        <FieldRow label="Room"           value={student?.roomNumber}    icon={Building2} system />
      </Section>

      {/* Parent / Guardian â€” only if data exists */}
      {(student?.parentName || student?.parentPhone || student?.parentEmail) && (
        <Section title="Parent / Guardian" icon={Users}>
          <FieldRow label="Parent Name"  value={student?.parentName}    icon={Users}   />
          <FieldRow label="Parent Phone" value={student?.parentPhone}   icon={Phone}   />
          <FieldRow label="Parent Email" value={student?.parentEmail}   icon={Mail}    />
        </Section>
      )}

      {/* Address â€” only if data exists */}
      {(student?.address || student?.city || student?.state) && (
        <Section title="Address" icon={MapPin}>
          <FieldRow label="Address"  value={student?.address}   icon={MapPin} />
          <FieldRow label="City"     value={student?.city}      icon={MapPin} />
          <FieldRow label="State"    value={student?.state}     icon={MapPin} />
          <FieldRow label="Pin Code" value={student?.pinCode}   icon={MapPin} />
        </Section>
      )}

      {/* System info */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 px-5 py-4">
        <div className="flex items-start gap-3">
          <Shield size={14} className="dark:text-zinc-500 text-zinc-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold dark:text-zinc-400 text-zinc-500">System-managed fields</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-400 leading-relaxed">
              USN, Floor, Room, Academic Year, Course, Branch and Admission Year are controlled by the hostel administration and cannot be changed here. Contact the hostel office for corrections.
            </p>
          </div>
        </div>
      </div>

      {/* Import source â€” dev info */}
      {student?.importSource && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300 justify-center pb-2">
          <Info size={11} />
          Record source: {student.importSource}
        </div>
      )}

    </div>
  )
}

