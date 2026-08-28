import { useState, useEffect } from 'react'
import { Phone, Mail, Shield, Loader2 } from 'lucide-react'
import { parentService, type ParentEmergencyContact } from '@/services/parentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

const CAT_COLOR: Record<string, string> = {
  Warden: '#3b6ef4', Admin: '#f59e0b', Security: '#ef4444', Medical: '#10b981', Emergency: '#ef4444',
}

export default function ParentContactsPage() {
  const { isDark } = useTheme()
  const [contacts, setContacts] = useState<ParentEmergencyContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parentService.getEmergencyContacts().then(res => { if (res.success && res.data) setContacts(res.data) }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark ? 'bg-red-500/15 border border-red-500/20' : 'bg-red-50 border border-red-200')}>
          <Phone size={18} className={isDark ? 'text-red-400' : 'text-red-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Emergency Contacts</h1>
          <p className={clsx('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>Warden and hostel administration</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-red-400" /></div>
      ) : contacts.length === 0 ? (
        <div className={clsx('rounded-2xl border p-12 text-center', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200')}>
          <p className={clsx('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>No contacts found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => {
            const color = CAT_COLOR[c.category] ?? '#94a3b8'
            return (
              <div key={c.id} className={clsx('rounded-2xl border p-5', isDark ? 'bg-dark-900 border-white/8' : 'bg-white border-slate-200 shadow-sm')}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Shield size={20} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-base font-bold', isDark ? 'text-slate-100' : 'text-slate-900')}>{c.name}</p>
                    <p className={clsx('text-xs mb-3', isDark ? 'text-slate-500' : 'text-slate-400')}>{c.designation}</p>
                    <a href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-all hover:opacity-90 mb-2"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 2px 10px ${color}40` }}>
                      <Phone size={14} /> {c.phone}
                    </a>
                    {c.email && (
                      <a href={`mailto:${c.email}`}
                        className={clsx('flex items-center gap-1.5 text-xs mt-1', isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}>
                        <Mail size={12} /> {c.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
