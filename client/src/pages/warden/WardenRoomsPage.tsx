import { useState, useEffect } from 'react'
import { Building2, Loader2, X } from 'lucide-react'
import { wardenService } from '@/services/wardenService'
import { useTheme } from '@/hooks/useTheme'
import clsx from 'clsx'

interface RoomStudent { id:string;name:string;usn:string;photoUrl?:string;status:string }
interface Room { id:string;roomNumber:string;capacity:number;occupied:number;vacant:number;students:RoomStudent[] }
interface Floor { id:string;floorNumber:string;rooms:Room[] }

function StudentModal({ id, name, onClose }: { id:string;name:string;onClose:()=>void }) {
  const { isDark } = useTheme()
  const [data, setData] = useState<Record<string,unknown>|null>(null)
  useEffect(()=>{ wardenService.getStudent(id).then(r=>{ if(r.success) setData(r.data) }) },[id])
  if(!data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx('rounded-2xl border p-8',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')} onClick={e=>e.stopPropagation()}>
        <Loader2 size={28} className="animate-spin text-accent-400"/>
      </div>
    </div>
  )
  const s=data as Record<string,unknown>
  const photoSrc=(s.photoUrl as string)?.startsWith('/')?`/api/uploads${(s.photoUrl as string).replace('/uploads','')}`:s.photoUrl as string
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={clsx('w-full max-w-md rounded-2xl border p-5 animate-scale-in',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200')} onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border dark:border-white/10 border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
              {s.photoUrl?<img src={photoSrc} alt={name} className="w-full h-full object-cover"/>:<span className={clsx('text-xl font-bold',isDark?'text-slate-400':'text-slate-500')}>{name.charAt(0)}</span>}
            </div>
            <div>
              <p className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>{s.name as string}</p>
              <p className={clsx('text-xs font-mono',isDark?'text-slate-400':'text-slate-500')}>{s.usn as string}</p>
            </div>
          </div>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg',isDark?'text-slate-500 hover:text-slate-300':'text-slate-400 hover:text-slate-600')}><X size={16}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {([
            ['Course',s.course],['Branch',s.branch],['Year',s.year],
            ['Academic Year',s.academicYear],['Floor · Room',`${s.floor} · ${s.room}`],
            ['Gender',s.gender],['Blood Group',s.bloodGroup],['Phone',s.phone],
          ] as [string,unknown][]).filter(([,v])=>v).map(([l,v])=>(
            <div key={l} className={clsx('rounded-xl p-2.5',isDark?'bg-dark-800':'bg-slate-50')}>
              <p className={clsx('text-[10px] uppercase tracking-wide mb-0.5',isDark?'text-slate-600':'text-slate-400')}>{l}</p>
              <p className={clsx('font-semibold truncate',isDark?'text-slate-200':'text-slate-700')}>{String(v)}</p>
            </div>
          ))}
          {s.fee ? (
            <div className={clsx('rounded-xl p-2.5 col-span-2',isDark?'bg-dark-800':'bg-slate-50')}>
              <p className={clsx('text-[10px] uppercase tracking-wide mb-1',isDark?'text-slate-600':'text-slate-400')}>Fees</p>
              <p className={clsx('font-semibold',isDark?'text-slate-200':'text-slate-700')}>
                Paid ₹{Number((s.fee as Record<string,number>).paidAmount).toLocaleString('en-IN')} · Pending ₹{Number((s.fee as Record<string,number>).pendingAmount).toLocaleString('en-IN')}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function WardenRoomsPage() {
  const { isDark } = useTheme()
  const [floors,  setFloors]  = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<{id:string;name:string}|null>(null)

  useEffect(()=>{
    wardenService.getRooms().then(r=>{ if(r.success) setFloors(r.data) }).finally(()=>setLoading(false))
  },[])

  const totalRooms    = floors.reduce((s,f)=>s+f.rooms.length,0)
  const totalOccupied = floors.reduce((s,f)=>s+f.rooms.filter(r=>r.occupied>0).length,0)
  const totalVacant   = totalRooms - totalOccupied

  if(loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-accent-400"/></div>

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
      {modal && <StudentModal id={modal.id} name={modal.name} onClose={()=>setModal(null)}/>}

      <div className="flex items-center gap-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',isDark?'bg-purple-500/15 border border-purple-500/20':'bg-purple-50 border border-purple-200')}>
          <Building2 size={18} className={isDark?'text-purple-400':'text-purple-600'}/>
        </div>
        <div>
          <h1 className={clsx('text-2xl font-bold',isDark?'text-white':'text-slate-900')}>Rooms</h1>
          <p className={clsx('text-xs',isDark?'text-slate-400':'text-slate-500')}>{totalRooms} rooms · {totalOccupied} occupied · {totalVacant} vacant</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {l:'Total Rooms',v:totalRooms,c:isDark?'text-slate-100':'text-slate-800'},
          {l:'Occupied',v:totalOccupied,c:'text-accent-400'},
          {l:'Vacant',v:totalVacant,c:'text-emerald-500'},
        ].map(({l,v,c})=>(
          <div key={l} className={clsx('rounded-2xl border p-4 text-center',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
            <p className={clsx('text-2xl font-bold',c)}>{v}</p>
            <p className={clsx('text-xs font-semibold mt-0.5',isDark?'text-slate-500':'text-slate-400')}>{l}</p>
          </div>
        ))}
      </div>

      {floors.map(floor=>(
        <div key={floor.id}>
          <h2 className={clsx('text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2',isDark?'text-slate-400':'text-slate-500')}>
            <Building2 size={13}/> {floor.floorNumber}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {floor.rooms.map(room=>(
              <div key={room.id} className={clsx('rounded-2xl border p-4',isDark?'bg-dark-900 border-white/8':'bg-white border-slate-200 shadow-sm')}>
                <div className="flex items-center justify-between mb-3">
                  <p className={clsx('text-base font-bold',isDark?'text-white':'text-slate-900')}>Room {room.roomNumber}</p>
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',room.vacant>0?'bg-emerald-500/10 text-emerald-500':'bg-red-500/10 text-red-500')}>
                    {room.vacant>0?`${room.vacant} Vacant`:'Full'}
                  </span>
                </div>
                <div className={clsx('h-1.5 rounded-full mb-3',isDark?'bg-dark-700':'bg-slate-100')}>
                  <div className="h-full rounded-full bg-accent-500 transition-all" style={{width:`${Math.round((room.occupied/room.capacity)*100)}%`}}/>
                </div>
                <p className={clsx('text-xs mb-3',isDark?'text-slate-500':'text-slate-400')}>{room.occupied}/{room.capacity} occupied</p>
                {room.students.length===0 ? (
                  <p className={clsx('text-xs italic',isDark?'text-slate-600':'text-slate-400')}>No students allocated</p>
                ) : (
                  <div className="space-y-2">
                    {room.students.map(s=>(
                      <button key={s.id} onClick={()=>setModal({id:s.id,name:s.name})}
                        className={clsx('w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors',isDark?'bg-dark-800 hover:bg-dark-700':'bg-slate-50 hover:bg-slate-100')}>
                        <div className="w-7 h-7 rounded-full overflow-hidden border dark:border-white/10 border-slate-200 bg-slate-200 flex items-center justify-center shrink-0 text-xs font-bold">
                          {s.photoUrl?<img src={`/api/uploads${s.photoUrl.replace('/uploads','')}`} alt={s.name} className="w-full h-full object-cover"/>:<span className={isDark?'text-slate-400':'text-slate-500'}>{s.name.charAt(0)}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={clsx('text-xs font-semibold truncate',isDark?'text-slate-200':'text-slate-800')}>{s.name}</p>
                          <p className={clsx('text-[10px] font-mono truncate',isDark?'text-slate-500':'text-slate-400')}>{s.usn}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
