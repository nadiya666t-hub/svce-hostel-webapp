import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import api from '@/services/api'
import clsx from 'clsx'

export default function OverseerProfilePage() {
  const { isDark } = useTheme()
  const [profile, setProfile] = useState<Record<string, string> | null>(null)
  useEffect(() => { api.get('/overseer/profile').then(r => { if (r.data.success) setProfile(r.data.data) }) }, [])
  const card = clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')
  return (
    <div className="max-w-xl mx-auto animate-fade-in space-y-5">
      <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-slate-900')}>Profile</h1>
      <div className={clsx(card, 'flex flex-col items-center text-center')}>
        <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-3', isDark ? 'bg-orange-500/15 border border-orange-500/25' : 'bg-orange-50 border border-orange-200')}>
          <Shield size={28} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
        </div>
        <h2 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>{profile?.name ?? '—'}</h2>
        <p className={clsx('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>{profile?.designation}</p>
      </div>
      <div className={card}>
        {[{ label: 'Overseer ID', value: profile?.overseerId }, { label: 'Email', value: profile?.email }, { label: 'Phone', value: profile?.phone }].map(({ label, value }) => (
          <div key={label} className={clsx('flex items-center justify-between py-3 border-b last:border-0', isDark ? 'border-white/5' : 'border-slate-100')}>
            <span className={clsx('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-slate-500' : 'text-slate-400')}>{label}</span>
            <span className={clsx('text-sm font-semibold font-mono', isDark ? 'text-slate-200' : 'text-slate-800')}>{value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
