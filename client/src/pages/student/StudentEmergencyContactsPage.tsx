import { useState, useEffect } from 'react'
import { Phone, Mail, Shield, Building2, User, Users } from 'lucide-react'
import { studentService, type EmergencyContact } from '@/services/studentService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

// Only show these categories in the Student Portal
const ALLOWED_CATEGORIES = ['Warden', 'Admin', 'Security', 'General']

const CATEGORY_META: Record<string, { icon: React.ElementType; accent: string }> = {
  Warden:  { icon: Shield,    accent: '#3b6ef4' },
  Admin:   { icon: Building2, accent: '#8b5cf6' },
  Security:{ icon: Shield,    accent: '#f59e0b' },
  General: { icon: User,      accent: '#6b7280' },
}

function ContactCard({ contact }: { contact: EmergencyContact }) {
  const { isDark } = useTheme()
  const meta = CATEGORY_META[contact.category] ?? CATEGORY_META.General
  const Icon = meta.icon

  return (
    <div className={clsx('rounded-2xl border p-4 flex items-start gap-3 transition-all duration-300 hover:-translate-y-0.5',
      isDark ? 'bg-dark-900 border-white/5 hover:border-white/8' : 'bg-white border-zinc-200 hover:border-zinc-300'
    )}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}25` }}>
        <Icon size={17} style={{ color: meta.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>{contact.name}</p>
        <p className={clsx('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>{contact.designation}</p>
        {contact.email && (
          <a href={`mailto:${contact.email}`}
            className={clsx('flex items-center gap-1.5 mt-1.5 text-xs transition-colors', isDark ? 'text-zinc-600 hover:text-accent-400' : 'text-zinc-400 hover:text-blue-600')}>
            <Mail size={11} /> {contact.email}
          </a>
        )}
      </div>
      <a href={`tel:${contact.phone}`}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all hover:-translate-y-0.5"
        style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}25`, color: meta.accent }}>
        <Phone size={12} /> {contact.phone}
      </a>
    </div>
  )
}

export default function StudentEmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const { isDark } = useTheme()

  useEffect(() => {
    studentService.getEmergencyContacts()
      .then(r => {
        if (r.success && r.data) {
          // Filter to only allowed categories
          setContacts(r.data.filter(c => ALLOWED_CATEGORIES.includes(c.category)))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // Group by category
  const grouped = contacts.reduce<Record<string, EmergencyContact[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  const sortedCategories = ['Warden', 'Admin', 'Security', 'General'].filter(c => grouped[c])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
          isDark ? 'bg-accent-600/15 border border-accent-600/20' : 'bg-blue-50 border border-blue-200')}>
          <Users size={18} className={isDark ? 'text-accent-400' : 'text-blue-600'} />
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold font-display', isDark ? 'text-white' : 'text-zinc-900')}>Emergency Contacts</h1>
          <p className={clsx('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>Hostel staff and management contacts</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-dark-800' : 'bg-zinc-100')} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map(cat => (
            <div key={cat}>
              <p className={clsx('text-[10px] font-bold uppercase tracking-widest mb-3 px-1', isDark ? 'text-zinc-600' : 'text-zinc-400')}>{cat}</p>
              <div className="space-y-3">
                {grouped[cat].map(c => <ContactCard key={c.id} contact={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
