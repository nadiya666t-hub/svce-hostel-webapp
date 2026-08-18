import { useState, useEffect } from 'react'
import { Phone, Mail, Shield, AlertTriangle, Heart, Building2, User } from 'lucide-react'
import { studentService, type EmergencyContact } from '@/services/studentService'
import clsx from 'clsx'

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Warden:    { icon: Shield,      color: 'text-primary-600', bg: 'bg-primary-50' },
  Admin:     { icon: Building2,   color: 'text-violet-600',  bg: 'bg-violet-50'  },
  Medical:   { icon: Heart,       color: 'text-rose-600',    bg: 'bg-rose-50'    },
  Security:  { icon: Shield,      color: 'text-amber-600',   bg: 'bg-amber-50'   },
  Emergency: { icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50'     },
  General:   { icon: User,        color: 'text-slate-600',   bg: 'bg-slate-50'   },
}

function ContactCard({ contact }: { contact: EmergencyContact }) {
  const meta = CATEGORY_META[contact.category] ?? CATEGORY_META.General
  const Icon = meta.icon
  const isEmergency = contact.category === 'Emergency'

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-card p-4 transition-all hover:shadow-card-hover',
      isEmergency ? 'border-red-200' : 'border-slate-100'
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
          <Icon size={18} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{contact.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{contact.designation}</p>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 hover:text-primary-600 transition-colors">
              <Mail size={11} /> {contact.email}
            </a>
          )}
        </div>
        <a
          href={`tel:${contact.phone}`}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
            isEmergency
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
              : 'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100'
          )}
        >
          <Phone size={13} /> {contact.phone}
        </a>
      </div>
    </div>
  )
}

export default function StudentEmergencyContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentService.getEmergencyContacts()
      .then(r => { if (r.success && r.data) setContacts(r.data) })
      .finally(() => setLoading(false))
  }, [])

  // Group by category
  const grouped = contacts.reduce<Record<string, EmergencyContact[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  const categoryOrder = ['Emergency', 'Warden', 'Admin', 'Medical', 'Security', 'General']
  const sortedCategories = [
    ...categoryOrder.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)),
  ]

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Phone size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Emergency Contacts</h1>
          <p className="text-sm text-slate-400">Hostel staff and emergency numbers</p>
        </div>
      </div>

      {/* Emergency numbers banner */}
      {grouped['Emergency'] && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Emergency Numbers
          </p>
          <div className="flex gap-3 flex-wrap">
            {grouped['Emergency'].map(c => (
              <a key={c.id} href={`tel:${c.phone}`}
                className="flex items-center gap-2 bg-red-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-red-600 transition-colors shadow-sm">
                <Phone size={14} /> {c.name} — {c.phone}
              </a>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.filter(c => c !== 'Emergency').map(category => (
            <div key={category}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">{category}</p>
              <div className="space-y-3">
                {grouped[category].map(c => <ContactCard key={c.id} contact={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
