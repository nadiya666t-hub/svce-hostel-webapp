import { useState, useEffect } from 'react'
import { Building2, Loader2, X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface RoomStudent { id:string; name:string; usn:string; photoUrl?:string; status:string }
interface Room  { id:string; roomNumber:string; capacity:number; occupied:number; vacant:number; students:RoomStudent[] }
interface Floor { id:string; floorNumber:string; rooms:Room[] }

function StudentModal({ id, name, onClose }: { id:string; name:string; onClose:()=>void }) {
  const { isDark } = useTheme()
  const [data, setData] = useState<Record<string,unknown>|null>(null)
  useEffect(() => { wardenService.getStudent(id).then(r => { if(r.success) setData(r.data) }) }, [id])
  if (!data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx('rounded-2xl border p-8', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')} onClick={e=>e.stopPropagation()}>
        <Loader2 size={28} className="animate-spin text-accent-400"/>
      </div>
    </div>
  )
  const s = data as Record<string,unknown>
  const photoSrc = (s.photoUrl as string)?.startsWith('/') ? `/api/uploads${(s.photoUrl as string).replace('/uploads','')}` : s.photoUrl as string
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={clsx('w-full max-w-md rounded-2xl border p-5 animate-scale-in', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')} onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border dark:border-white/10 border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
              {s.photoUrl ? <img src={photoSrc} alt={name} className="w-full h-full object-cover"/> : <span className={clsx('text-xl font-bold', isDark?'text-slate-400':'text-slate-500')}>{name.charAt(0)}</span>}
            </div>
            <div>
              <p className={clsx('text-base font-bold', isDark?'text-white':'text-slate-900')}>{s.name as string}</p>
              <p className={clsx('text-xs font-mono', isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</p>
            </div>
          </div>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg', isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {([
            ['Floor · Room', `${s.floor} · Room ${s.room}`],
            ['Year',         s.year],
            ['Academic Year',s.academicYear],
            ['Course',       s.course],
            ['Branch',       s.branch],
            ['Gender',       s.gender],
            ['Phone',        s.phone],
          ] as [string,unknown][]).filter(([,v])=>v).map(([l,v])=>(
            <div key={l} className={clsx('rounded-xl p-2.5', isDark?'bg-dark-800':'bg-slate-50')}>
              <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5', isDark?'text-slate-600':'text-slate-400')}>{l}</p>
              <p className={clsx('font-semibold truncate', isDark?'text-slate-200':'text-slate-700')}>{String(v)}</p>
            </div>
          ))}
          {!!s.fee && (
            <div className={clsx('rounded-xl p-2.5 col-span-2', isDark?'bg-dark-800':'bg-slate-50')}>
              <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5', isDark?'text-slate-600':'text-slate-400')}>Fees</p>
              <p className={clsx('font-semibold', isDark?'text-slate-200':'text-slate-700')}>
                Paid ₹{Number((s.fee as Record<string,number>).paidAmount).toLocaleString('en-IN')} · Pending ₹{Number((s.fee as Record<string,number>).pendingAmount).toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WardenRoomsPage() {
  const { isDark }   = useTheme()
  const [floors,   setFloors]   = useState<Floor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [modal,    setModal]    = useState<{id:string;name:string}|null>(null)

  useEffect(() => {
    wardenService.getRooms().then(r => {
      if (r.success) {
        // Filter out 4th floor and beyond (keep only 1st, 2nd, 3rd)
        const filtered = (r.data as Floor[]).filter(f =>
          f.floorNumber === '1st Floor' || f.floorNumber === '2nd Floor' || f.floorNumber === '3rd Floor'
        )
        setFloors(filtered)
      }
    }).finally(() => setLoading(false))
  }, [])

  const totalRooms    = floors.reduce((s,f)=>s+f.rooms.length, 0)
  const totalOccupied = floors.reduce((s,f)=>s+f.rooms.filter(r=>r.occupied>0).length, 0)
  const totalVacant   = totalRooms - totalOccupied
  const toggle = (id:string) => setExpanded(e => e===id ? null : id)

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-accent-400"/></div>

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
      {modal && <StudentModal id={modal.id} name={modal.name} onClose={()=>setModal(null)}/>}

      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', isDark?'bg-purple-500/15 border border-purple-500/20':'bg-purple-50 border border-purple-200')}>
          <Building2 size={18} className={isDark?'text-purple-400':'text-purple-600'}/>
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold', isDark?'text-white':'text-slate-900')}>Rooms</h1>
          <p className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>{totalRooms} rooms · {totalOccupied} occupied · {totalVacant} vacant</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l:'Total Rooms', v:totalRooms,    c:isDark?'text-slate-100':'text-slate-800' },
          { l:'Occupied',    v:totalOccupied, c:'text-accent-400' },
          { l:'Vacant',      v:totalVacant,   c:'text-emerald-500' },
        ].map(({l,v,c}) => (
          <div key={l} className={clsx('rounded-2xl border p-4 text-center', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-2xl font-bold', c)}>{v}</p>
            <p className={clsx('text-xs font-semibold mt-0.5', isDark?'text-slate-500':'text-slate-400')}>{l}</p>
          </div>
        ))}
      </div>

      {/* Accordion floors */}
      <div className="space-y-3">
        {floors.map(floor => {
          const floorOccupied = floor.rooms.reduce((s,r)=>s+r.occupied, 0)
          const floorCapacity = floor.rooms.reduce((s,r)=>s+r.capacity, 0)
          const isOpen = expanded === floor.id
          return (
            <div key={floor.id} className={clsx('rounded-2xl border overflow-hidden', isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
              <button onClick={()=>toggle(floor.id)} className={clsx('w-full flex items-center justify-between p-5', isDark?'hover:bg-white/3':'hover:bg-slate-50')}>
                <div className="flex items-center gap-3">
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold', isDark?'bg-purple-500/20 text-purple-400':'bg-purple-100 text-purple-700')}>
                    {floor.floorNumber.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className={clsx('text-sm font-bold', isDark?'text-slate-200':'text-slate-800')}>{floor.floorNumber}</p>
                    <p className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>
                      {floor.rooms.length} rooms · {floorOccupied}/{floorCapacity} occupied
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini room status dots */}
                  <div className="flex gap-1 flex-wrap max-w-[120px]">
                    {floor.rooms.map(r => (
                      <div key={r.id} title={`Room ${r.roomNumber}: ${r.occupied}/${r.capacity}`}
                        className={clsx('w-2 h-2 rounded-sm', r.vacant===0?'bg-red-500':r.occupied>0?'bg-amber-500':'bg-emerald-500')}/>
                    ))}
                  </div>
                  {isOpen ? <ChevronUp size={16} className={isDark?'text-slate-500':'text-slate-400'}/> : <ChevronDown size={16} className={isDark?'text-slate-500':'text-slate-400'}/>}
                </div>
              </button>

              {isOpen && (
                <div className={clsx('border-t grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4', isDark?'border-white/5 bg-dark-800':'border-slate-100 bg-slate-50')}>
                  {floor.rooms.map(room => (
                    <div key={room.id} className={clsx('rounded-xl border p-3',
                      room.vacant===0
                        ? isDark?'bg-red-500/10 border-red-500/20':'bg-red-50 border-red-200'
                        : room.occupied>0
                        ? isDark?'bg-amber-500/10 border-amber-500/20':'bg-amber-50 border-amber-200'
                        : isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')}>
                      <p className={clsx('text-sm font-bold mb-1', isDark?'text-slate-200':'text-slate-800')}>Room {room.roomNumber}</p>
                      <div className="flex items-center gap-1 mb-2">
                        <Users size={11} className={isDark?'text-slate-500':'text-slate-400'}/>
                        <span className={clsx('text-xs', isDark?'text-slate-400':'text-slate-500')}>{room.occupied}/{room.capacity}</span>
                        {room.vacant > 0 && <span className="text-[10px] text-emerald-500 ml-auto">{room.vacant} free</span>}
                      </div>
                      {room.students.length === 0 ? (
                        <p className={clsx('text-[10px]', isDark?'text-slate-600':'text-slate-400')}>Vacant</p>
                      ) : (
                        <div className="space-y-1">
                          {room.students.map(s => (
                            <button key={s.id} onClick={()=>setModal({id:s.id,name:s.name})}
                              className={clsx('w-full flex items-center gap-1.5 text-left rounded-lg px-1.5 py-1 transition-colors', isDark?'hover:bg-white/5':'hover:bg-slate-100')}>
                              <div className="w-5 h-5 rounded-full overflow-hidden border dark:border-white/10 border-slate-200 bg-slate-200 flex items-center justify-center shrink-0 text-[9px] font-bold">
                                {s.photoUrl ? <img src={`/api/uploads${s.photoUrl.replace('/uploads','')}`} alt={s.name} className="w-full h-full object-cover"/> : <span className={isDark?'text-slate-400':'text-slate-500'}>{s.name.charAt(0)}</span>}
                              </div>
                              <p className={clsx('text-[10px] truncate', isDark?'text-slate-300':'text-slate-700')}>{s.name}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pb-2">
        {[['bg-emerald-500','Vacant'],['bg-amber-500','Partial'],['bg-red-500','Full']].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className={clsx('w-2.5 h-2.5 rounded-sm', c)}/>
            <span className={clsx('text-xs', isDark?'text-slate-500':'text-slate-400')}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
