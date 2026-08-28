import { useState, useEffect, useCallback } from 'react'
import { Phone, Plus, Loader2, X, Pencil, Trash2 } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface Contact { id:string;name:string;designation:string;phone:string;email?:string;category:string;sortOrder:number }

function ContactForm({ initial, onSave, onCancel }: { initial?: Contact; onSave: (data:object,id?:string)=>void; onCancel:()=>void }) {
  const { isDark } = useTheme()
  const [name,   setName]   = useState(initial?.name??'')
  const [desig,  setDesig]  = useState(initial?.designation??'')
  const [phone,  setPhone]  = useState(initial?.phone??'')
  const [email,  setEmail]  = useState(initial?.email??'')
  const [cat,    setCat]    = useState(initial?.category??'Warden')
  const [sort,   setSort]   = useState(initial?.sortOrder??0)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name||!desig||!phone) { setError('Name, designation and phone are required.'); return }
    setSaving(true)
    try { await onSave({name,designation:desig,phone,email:email||undefined,category:cat,sortOrder:sort}, initial?.id) }
    catch(e2:unknown) { setError((e2 as {response?:{data?:{message?:string}}})?.response?.data?.message??'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className={clsx('rounded-2xl border p-5 animate-slide-down',isDark?'bg-dark-800 border-white/8':'bg-slate-50 border-slate-200')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={clsx('text-sm font-bold',isDark?'text-white':'text-slate-900')}>{initial?'Edit Contact':'Add Contact'}</h3>
        <button onClick={onCancel} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={15}/></button>
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-xs">{error}</div>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([['Name',name,setName,'text'],['Designation',desig,setDesig,'text'],['Phone',phone,setPhone,'tel'],['Email',email,setEmail,'email']] as [string,string,(v:string)=>void,string][]).map(([l,v,fn,t])=>(
          <div key={l}>
            <label className="field-label">{l}</label>
            <input type={t} value={v} onChange={e=>fn(e.target.value)} placeholder={l} className="input-dark w-full" />
          </div>
        ))}
        <div>
          <label className="field-label">Category</label>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="input-dark w-full">
            {['Warden','Admin','General'].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Sort Order</label>
          <input type="number" value={sort} onChange={e=>setSort(Number(e.target.value))} className="input-dark w-full" />
        </div>
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={saving} className="btn-accent text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50">
            {saving?<Loader2 size={13} className="animate-spin"/>:null} Save
          </button>
          <button type="button" onClick={onCancel} className={clsx('px-4 py-2 rounded-xl border text-sm',isDark?'border-white/8 text-slate-300 hover:bg-dark-700':'border-slate-200 text-slate-600 hover:bg-slate-100')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default function WardenEmergencyContactsPage() {
  const { isDark } = useTheme()
  const [contacts,  setContacts] = useState<Contact[]>([])
  const [loading,   setLoading]  = useState(true)
  const [showAdd,   setShowAdd]  = useState(false)
  const [editing,   setEditing]  = useState<Contact|null>(null)

  const load = useCallback(async()=>{
    setLoading(true)
    try{ const r=await wardenService.getEmergencyContacts(); if(r.success) setContacts(r.data) }
    finally{ setLoading(false) }
  },[])

  useEffect(()=>{ load() },[load])

  async function handleSave(data: object, id?: string) {
    await wardenService.saveContact(data, id); setShowAdd(false); setEditing(null); load()
  }
  async function handleDelete(id: string) {
    if (!confirm('Remove this contact?')) return
    await wardenService.deleteContact(id); load()
  }

  const CAT_COLOR: Record<string,string> = { Warden:'#3b6ef4', Admin:'#8b5cf6', General:'#64748b' }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-red-500/15 border border-red-500/20':'bg-red-50 border border-red-200')}>
            <Phone size={18} className={isDark?'text-red-400':'text-red-600'} />
          </div>
          <div>
            <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Emergency Contacts</h1>
            <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>Manage hostel emergency contacts</p>
          </div>
        </div>
        {!showAdd && !editing && (
          <button onClick={()=>setShowAdd(true)} className="btn-accent text-sm px-4 py-2 flex items-center gap-1.5">
            <Plus size={15}/> Add Contact
          </button>
        )}
      </div>

      {showAdd && <div className="mb-4"><ContactForm onSave={handleSave} onCancel={()=>setShowAdd(false)}/></div>}

      {loading ? <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-red-400"/></div>
        : contacts.length===0 ? (
          <div className={clsx('rounded-2xl border p-12 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
            <p className={clsx('text-sm',isDark?'text-slate-500':'text-slate-400')}>No contacts yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map(c=>(
              editing?.id===c.id ? (
                <div key={c.id}><ContactForm initial={c} onSave={handleSave} onCancel={()=>setEditing(null)}/></div>
              ) : (
                <div key={c.id} className={clsx('rounded-2xl border p-5 flex items-start gap-4',isDark?'bg-dark-900 border-white/5':'bg-white border-slate-200 shadow-sm')}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{background:`${CAT_COLOR[c.category]??'#64748b'}18`,border:`1px solid ${CAT_COLOR[c.category]??'#64748b'}30`}}>
                    <Phone size={18} style={{color:CAT_COLOR[c.category]??'#64748b'}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-base font-bold',isDark?'text-slate-100':'text-slate-900')}>{c.name}</p>
                    <p className={clsx('text-xs mb-2',isDark?'text-slate-500':'text-slate-400')}>{c.designation} · {c.category}</p>
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl"
                      style={{background:`linear-gradient(135deg,${CAT_COLOR[c.category]??'#64748b'},${CAT_COLOR[c.category]??'#64748b'}cc)`}}>
                      <Phone size={13}/> {c.phone}
                    </a>
                    {c.email && <p className={clsx('text-xs mt-1',isDark?'text-slate-500':'text-slate-400')}>{c.email}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>setEditing(c)} className={clsx('p-2 rounded-xl transition-colors',isDark?'text-slate-500 hover:text-accent-400 hover:bg-accent-600/10':'text-slate-400 hover:text-accent-600 hover:bg-accent-50')}><Pencil size={14}/></button>
                    <button onClick={()=>handleDelete(c.id)} className={clsx('p-2 rounded-xl transition-colors',isDark?'text-slate-500 hover:text-red-400 hover:bg-red-500/10':'text-slate-400 hover:text-red-500 hover:bg-red-50')}><Trash2 size={14}/></button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
    </div>
  )
}
