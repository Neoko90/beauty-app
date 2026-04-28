'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addMinutes, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns'
import { pl } from 'date-fns/locale'
import { cn, formatCurrency, formatTime, minutesToHHMM } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, Scissors, CreditCard, Search, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, Avatar, Spinner } from '@/components/ui/index'
import type { Staff, Service, Resource, Client, Appointment } from '@/types'

type CalView = 'week' | 'day' | 'month' | 'pending' | 'history'

interface Props {
  salonId: string
  staff: Staff[]
  services: Service[]
  resources: Resource[]
  clients: Client[]
  initialDate?: string
  initialView?: CalView
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7:00 - 21:00
const HOUR_HEIGHT = 64 // px per hour
const STATUS_OPTIONS = [
  { value: 'confirmed', label: '✅ Potwierdzona' },
  { value: 'pending', label: '⏳ Oczekuje na potw.' },
  { value: 'awaiting_deposit', label: '💳 Czeka na zadatek' },
  { value: 'done', label: '✔️ Odbyta' },
  { value: 'cancelled', label: '❌ Anulowana' },
  { value: 'no_show', label: '🚫 Nieobecność' },
]
const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Gotówka' },
  { value: 'blik', label: 'BLIK' },
  { value: 'card', label: 'Karta' },
  { value: 'transfer', label: 'Przelew' },
]
const DURATION_OPTIONS = [15,30,45,60,75,90,105,120,150,180,210,240].map(m => ({ value: String(m), label: `${m} min` }))

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-50 border-green-200 text-green-800',
  pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  awaiting_deposit: 'bg-blue-50 border-blue-200 text-blue-800',
  done: 'bg-gray-50 border-gray-200 text-gray-600',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  no_show: 'bg-red-100 border-red-300 text-red-800',
}

export function KalendarzClient({ salonId, staff, services, resources, clients, initialDate, initialView }: Props) {
  const supabase = createClient()
  const [view, setView] = useState<CalView>(initialView || 'week')
  const [currentDate, setCurrentDate] = useState(() => initialDate ? parseISO(initialDate) : new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt] = useState<Appointment | null>(null)
  const [clickedSlot, setClickedSlot] = useState<{ date: Date; staffId?: string } | null>(null)

  // Appointment form state
  const [form, setForm] = useState({
    client_id: '', client_name: '', client_phone: '',
    service_id: '', staff_id: staff[0]?.id || '',
    resource_id: '', status: 'confirmed', payment_method: '',
    starts_at: '', price: '', duration: '60',
    referral_code: '', notes: '', discount: '0',
  })
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [formLoading, setFormLoading] = useState(false)

  // Date range for current view
  const dateRange = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return { start, end, days: eachDayOfInterval({ start, end }) }
    }
    if (view === 'day') {
      return { start: currentDate, end: currentDate, days: [currentDate] }
    }
    if (view === 'month') {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      return { start, end, days: eachDayOfInterval({ start, end }) }
    }
    // For pending/history, show current month
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return { start, end, days: [] }
  }, [view, currentDate])

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, client:clients(id, name, phone, referral_code), service:services(name, color), staff:staff(name, color), resource:resources(name)')
      .eq('salon_id', salonId)
      .gte('starts_at', dateRange.start.toISOString())
      .lte('starts_at', dateRange.end.toISOString() + 'T23:59:59')
      .order('starts_at')

    setAppointments(data as any || [])
    setLoading(false)
  }, [salonId, dateRange])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  // Client search
  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return }
    const q = clientSearch.toLowerCase()
    setClientResults(clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8))
  }, [clientSearch, clients])

  // When service changes, update price and duration
  useEffect(() => {
    if (form.service_id) {
      const svc = services.find(s => s.id === form.service_id)
      if (svc) {
        setForm(f => ({ ...f, price: String(svc.price), duration: String(svc.duration_minutes) }))
      }
    }
  }, [form.service_id, services])

  // When slot clicked
  useEffect(() => {
    if (clickedSlot) {
      setForm(f => ({
        ...f,
        starts_at: format(clickedSlot.date, "yyyy-MM-dd'T'HH:mm"),
        staff_id: clickedSlot.staffId || staff[0]?.id || '',
      }))
      setShowModal(true)
      setClickedSlot(null)
    }
  }, [clickedSlot, staff])

  const navigate = (dir: 1 | -1) => {
    if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else if (view === 'day') setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1))
    else setCurrentDate(d => {
      const next = new Date(d)
      next.setMonth(d.getMonth() + dir)
      return next
    })
  }

  const handleSaveAppt = async () => {
    if (!form.service_id || !form.staff_id || !form.starts_at) return
    setFormLoading(true)

    const starts = new Date(form.starts_at)
    const ends = addMinutes(starts, parseInt(form.duration))
    const svc = services.find(s => s.id === form.service_id)

    const payload = {
      salon_id: salonId,
      client_id: form.client_id || null,
      client_name: form.client_name || null,
      client_phone: form.client_phone || null,
      service_id: form.service_id,
      staff_id: form.staff_id,
      resource_id: form.resource_id || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      price: parseFloat(form.price || String(svc?.price || 0)),
      original_price: svc?.price || parseFloat(form.price || '0'),
      discount: parseFloat(form.discount || '0'),
      status: form.status,
      payment_method: form.payment_method || null,
      referral_code: form.referral_code || null,
      notes: form.notes || null,
      source: 'manual',
    }

    if (editAppt) {
      await supabase.from('appointments').update(payload).eq('id', editAppt.id)
    } else {
      await supabase.from('appointments').insert(payload)
    }

    setShowModal(false)
    setEditAppt(null)
    resetForm()
    fetchAppointments()
    setFormLoading(false)
  }

  const resetForm = () => {
    setForm({ client_id: '', client_name: '', client_phone: '', service_id: '', staff_id: staff[0]?.id || '', resource_id: '', status: 'confirmed', payment_method: '', starts_at: '', price: '', duration: '60', referral_code: '', notes: '', discount: '0' })
    setClientSearch('')
    setClientResults([])
  }

  const openNewAppt = () => {
    resetForm()
    setEditAppt(null)
    setForm(f => ({ ...f, starts_at: format(new Date(), "yyyy-MM-dd'T'HH:mm") }))
    setShowModal(true)
  }

  const openEditAppt = (appt: Appointment) => {
    setEditAppt(appt)
    setForm({
      client_id: appt.client_id || '',
      client_name: (appt as any).client?.name || appt.client_name || '',
      client_phone: (appt as any).client?.phone || appt.client_phone || '',
      service_id: appt.service_id,
      staff_id: appt.staff_id,
      resource_id: appt.resource_id || '',
      status: appt.status,
      payment_method: appt.payment_method || '',
      starts_at: format(new Date(appt.starts_at), "yyyy-MM-dd'T'HH:mm"),
      price: String(appt.price),
      duration: String(Math.round((new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60000)),
      referral_code: appt.referral_code || '',
      notes: appt.notes || '',
      discount: String(appt.discount || 0),
    })
    setClientSearch((appt as any).client?.name || appt.client_name || '')
    setShowModal(true)
  }

  const handleDeleteAppt = async (id: string) => {
    if (!confirm('Usunąć wizytę?')) return
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    fetchAppointments()
    setShowModal(false)
  }

  // ── Appointment block (time grid) ─────────────────────────
  const renderApptBlock = (appt: Appointment, columnWidth: number, col: number) => {
    const start = new Date(appt.starts_at)
    const end = new Date(appt.ends_at)
    const startMin = (start.getHours() - 7) * 60 + start.getMinutes()
    const durationMin = (end.getTime() - start.getTime()) / 60000
    const top = (startMin / 60) * HOUR_HEIGHT
    const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 28)
    const staffMember = staff.find(s => s.id === appt.staff_id)
    const color = staffMember?.color || '#7C3AED'

    return (
      <div
        key={appt.id}
        className={cn('absolute left-0.5 right-0.5 rounded-lg px-2 py-1 cursor-pointer overflow-hidden border-l-2 transition-all hover:brightness-95 hover:shadow-sm', STATUS_COLORS[appt.status] || 'bg-violet-50 border-violet-200')}
        style={{ top: `${top}px`, height: `${height}px`, borderLeftColor: color, left: '2px', right: '2px' }}
        onClick={() => openEditAppt(appt)}
      >
        <p className="text-xs font-semibold truncate leading-tight">{(appt as any).client?.name || appt.client_name || 'Gość'}</p>
        {height > 40 && <p className="text-xs opacity-70 truncate">{(appt as any).service?.name}</p>}
        {height > 55 && <p className="text-xs opacity-60 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatTime(appt.starts_at)}</p>}
      </div>
    )
  }

  // ── Week/Day view ─────────────────────────────────────────
  const renderTimeGrid = () => {
    const days = view === 'day' ? [currentDate] : dateRange.days

    // W widoku dziennym: jedna kolumna per pracownik
    if (view === 'day') {
      const activeStaff = staff.filter(s => s.visible_in_calendar)
      const cols = activeStaff.length > 0 ? activeStaff : [null] // fallback: jedna kolumna bez pracownika
      const day = currentDate
      const isToday = isSameDay(day, new Date())

      return (
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Sticky header: godziny + nagłówki pracowników */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
            {/* Placeholder dla kolumny godzin */}
            <div className="flex-shrink-0 w-14" />
            {cols.map((s, ci) => (
              <div
                key={s?.id || 'all'}
                className="flex-1 min-w-28 border-l border-gray-100 px-2 py-2 text-center"
              >
                {s ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* Małe zdjęcie/awatar pracownika */}
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name}
                        className="w-8 h-8 rounded-full object-cover border-2"
                        style={{ borderColor: s.color }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: s.color }}>
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 truncate max-w-full">{s.name.split(' ')[0]}</span>
                  </div>
                ) : (
                  <div className="py-1">
                    <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE', { locale: pl })}</p>
                    <p className={cn('text-sm font-bold', isToday ? 'text-violet-600' : 'text-gray-800')}>
                      {format(day, 'd')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Scrollowalny obszar siatki */}
          <div className="flex overflow-y-auto overflow-x-auto flex-1">
            {/* Sticky kolumna godzin */}
            <div className="flex-shrink-0 w-14 border-r border-gray-100 sticky left-0 bg-white z-10">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="border-t border-gray-100 text-right pr-2 text-xs text-gray-400 select-none"
                  style={{ height: `${HOUR_HEIGHT}px`, paddingTop: '4px' }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Kolumny pracowników */}
            <div className="flex flex-1" style={{ minWidth: cols.length * 120 }}>
              {cols.map((s, ci) => {
                const colAppts = s
                  ? appointments.filter(a => isSameDay(new Date(a.starts_at), day) && a.staff_id === s.id)
                  : appointments.filter(a => isSameDay(new Date(a.starts_at), day))

                return (
                  <div key={s?.id || 'all'} className="flex-1 min-w-28 border-l border-gray-100 relative"
                    style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                    {/* Linie godzin + klikalne sloty */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-gray-50 hover:bg-violet-50/30 cursor-pointer transition-colors"
                        style={{ top: `${(h - 7) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        onClick={() => {
                          const d = new Date(day)
                          d.setHours(h, 0, 0, 0)
                          setClickedSlot({ date: d, staffId: s?.id })
                        }}
                      />
                    ))}
                    {colAppts.map(appt => renderApptBlock(appt, 0, ci))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    // Widok tygodniowy — oryginalna siatka ze sticky hours
    return (
      <div className="flex" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }}>
        {/* Sticky kolumna godzin */}
        <div className="flex-shrink-0 w-14 border-r border-gray-100 flex flex-col">
          {/* Header spacer */}
          <div className="flex-shrink-0 h-10 border-b border-gray-100" />
          {/* Godziny scrollują razem z siatką */}
          <div className="overflow-y-hidden flex-1">
            <div id="hours-col">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="border-t border-gray-100 text-right pr-2 text-xs text-gray-400 select-none"
                  style={{ height: `${HOUR_HEIGHT}px`, paddingTop: '4px' }}
                >
                  {h}:00
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dni — scroll synchronizowany */}
        <div
          className="flex-1 overflow-auto"
          onScroll={e => {
            const el = document.getElementById('hours-col')
            if (el) el.style.transform = `translateY(-${(e.target as HTMLElement).scrollTop}px)`
          }}
        >
          <div className="flex" style={{ minWidth: days.length * 120 }}>
            {days.map((day, di) => {
              const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
              const isToday = isSameDay(day, new Date())

              return (
                <div key={di} className="flex-1 min-w-28 border-r border-gray-100 last:border-r-0">
                  {/* Sticky nagłówek dnia */}
                  <div className={cn(
                    'sticky top-0 z-10 bg-white border-b border-gray-100 text-center py-2',
                    isToday ? 'bg-violet-50' : ''
                  )}>
                    <p className="text-xs text-gray-500 uppercase">{format(day, 'EEE', { locale: pl })}</p>
                    <p className={cn('text-sm font-bold', isToday ? 'text-violet-600' : 'text-gray-800')}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-gray-50 hover:bg-violet-50/30 cursor-pointer transition-colors"
                        style={{ top: `${(h - 7) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                        onClick={() => {
                          const d = new Date(day)
                          d.setHours(h, 0, 0, 0)
                          setClickedSlot({ date: d })
                        }}
                      />
                    ))}
                    {dayAppts.map(appt => renderApptBlock(appt, 0, 0))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Month view ─────────────────────────────────────────────
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })

    return (
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>
        {weeks.map(weekStart => {
          const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-7 border-b border-gray-50">
              {weekDays.map(day => {
                const dayAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), day))
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                const isToday = isSameDay(day, new Date())

                return (
                  <div key={day.toISOString()} className={cn('min-h-20 p-1.5 border-r border-gray-50 last:border-r-0', !isCurrentMonth && 'opacity-30')}>
                    <div
                      className={cn('w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 cursor-pointer',
                        isToday ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      )}
                      onClick={() => { setCurrentDate(day); setView('day') }}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayAppts.slice(0, 3).map(appt => {
                      const s = staff.find(st => st.id === appt.staff_id)
                      return (
                        <div
                          key={appt.id}
                          className="text-xs px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: s?.color + '20' || '#7C3AED20', color: s?.color || '#7C3AED', borderLeft: `2px solid ${s?.color || '#7C3AED'}` }}
                          onClick={() => openEditAppt(appt)}
                        >
                          {(appt as any).client?.name || 'Gość'}
                        </div>
                      )
                    })}
                    {dayAppts.length > 3 && <p className="text-xs text-gray-400">+{dayAppts.length - 3} więcej</p>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Pending / History ─────────────────────────────────────
  const renderList = () => {
    const filtered = view === 'pending'
      ? appointments.filter(a => a.status === 'pending' || a.status === 'awaiting_deposit')
      : appointments.filter(a => a.status === 'done' || a.status === 'cancelled' || a.status === 'no_show')

    return (
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{view === 'pending' ? 'Brak oczekujących wizyt' : 'Brak historii wizyt'}</p>
          </div>
        )}
        {filtered.map(appt => {
          const s = staff.find(st => st.id === appt.staff_id)
          const svc = services.find(sv => sv.id === appt.service_id)
          const STATUS_LABELS: Record<string, string> = { confirmed: 'Potwierdzona', pending: 'Oczekuje', awaiting_deposit: 'Zadatek', done: 'Odbyta', cancelled: 'Anulowana', no_show: 'Nieobecność' }
          return (
            <div key={appt.id} onClick={() => openEditAppt(appt)} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-violet-200 cursor-pointer flex items-center gap-4 transition-all">
              <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: s?.color || '#7C3AED' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{(appt as any).client?.name || appt.client_name || 'Gość'}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLORS[appt.status])}>{STATUS_LABELS[appt.status]}</span>
                </div>
                <p className="text-sm text-gray-500">{svc?.name} · {format(new Date(appt.starts_at), 'dd.MM.yyyy HH:mm', { locale: pl })}</p>
                <p className="text-xs text-gray-400">{s?.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(appt.price)}</p>
                {appt.discount > 0 && <p className="text-xs text-green-600">-{formatCurrency(appt.discount)}</p>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Header label ─────────────────────────────────────────
  const headerLabel = useMemo(() => {
    if (view === 'day') return format(currentDate, 'EEEE, d MMMM yyyy', { locale: pl })
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'd')}–${format(end, 'd MMM yyyy', { locale: pl })}`
    }
    return format(currentDate, 'LLLL yyyy', { locale: pl })
  }, [view, currentDate])

  // ── Available resources for selected service ───────────────
  const availableResources = useMemo(() => {
    if (!form.service_id) return resources
    const svc = services.find(s => s.id === form.service_id)
    if (!svc || svc.resource_ids.length === 0) return resources
    return resources.filter(r => svc.resource_ids.includes(r.id))
  }, [form.service_id, services, resources])

  const availableStaff = useMemo(() => {
    if (!form.service_id) return staff
    const svc = services.find(s => s.id === form.service_id)
    if (!svc || svc.staff_ids.length === 0) return staff
    return staff.filter(s => svc.staff_ids.includes(s.id))
  }, [form.service_id, services, staff])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-base font-semibold text-gray-800 min-w-40 text-center capitalize">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">Dziś</button>
        </div>

        {/* View tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {(['week','day','month','pending','history'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              {v === 'week' ? 'Tydzień' : v === 'day' ? 'Dzień' : v === 'month' ? 'Miesiąc' : v === 'pending' ? 'Oczekujące' : 'Historia'}
            </button>
          ))}
        </div>

        <Button onClick={openNewAppt} icon={<Plus className="w-4 h-4" />}>
          Nowa wizyta
        </Button>
      </div>

      {/* Calendar body */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : view === 'month' ? renderMonthView()
          : view === 'pending' || view === 'history' ? (
            <div className="p-4">{renderList()}</div>
          ) : renderTimeGrid()
        }
      </div>

      {/* Appointment Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditAppt(null); resetForm() }}
        title={editAppt ? 'Edytuj wizytę' : 'Nowa wizyta'}
        size="lg"
        footer={
          <div className="flex items-center gap-2 w-full">
            {editAppt && (
              <Button variant="danger" onClick={() => handleDeleteAppt(editAppt.id)} className="mr-auto">Anuluj wizytę</Button>
            )}
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm() }}>Anuluj</Button>
            <Button onClick={handleSaveAppt} loading={formLoading}>
              {editAppt ? 'Zapisz zmiany' : 'Dodaj wizytę'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Client search / autocomplete */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Klientka *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); if (!e.target.value) { setForm(f => ({ ...f, client_id: '', client_name: '', client_phone: '' })) } }}
                placeholder="Szukaj po imieniu lub telefonie..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {clientResults.length > 0 && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto z-50 absolute w-full">
                {clientResults.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: c.name, client_phone: c.phone })); setClientSearch(c.name); setClientResults([]) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-violet-50 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone} {c.no_show_count > 0 && <span className="text-red-500">· {c.no_show_count}× nieobecność</span>}</p>
                    {c.active_discount > 0 && <p className="text-xs text-green-600">🏷️ Rabat: {c.active_discount} {c.active_discount_type === 'percent' ? '%' : 'zł'}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone (if no client selected) */}
          {!form.client_id && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Imię i nazwisko" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Anna Kowalska" />
              <Input label="Telefon" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} placeholder="+48 600 000 000" />
            </div>
          )}

          {/* Service */}
          <Select
            label="Usługa"
            required
            value={form.service_id}
            onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
            placeholder="— wybierz usługę —"
            options={services.map(s => ({ value: s.id, label: `${s.name} · ${s.price} zł · ${s.duration_minutes} min` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Input label="Cena (zł)" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="80" />
            </div>
            <Select
              label="Czas"
              value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              options={DURATION_OPTIONS}
            />
          </div>

          {/* Discount */}
          <Input label="Rabat (zł)" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} type="number" placeholder="0" hint="Zostanie odjęty od przychodu" />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Płatność"
              value={form.payment_method}
              onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              placeholder="— sposób płatności —"
              options={PAYMENT_OPTIONS}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={STATUS_OPTIONS}
            />
          </div>

          <Input
            label="Data i godzina *"
            type="datetime-local"
            value={form.starts_at}
            onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
            required
          />

          <Select
            label="Pracownik"
            value={form.staff_id}
            onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
            placeholder="— wybierz —"
            options={availableStaff.map(s => ({ value: s.id, label: s.name }))}
          />

          {availableResources.length > 0 && (
            <Select
              label="Zasób (gabinet/fotel)"
              value={form.resource_id}
              onChange={e => setForm(f => ({ ...f, resource_id: e.target.value }))}
              placeholder="— opcjonalnie —"
              options={availableResources.map(r => ({ value: r.id, label: r.name }))}
            />
          )}

          <Input label="Kod polecającej" value={form.referral_code} onChange={e => setForm(f => ({ ...f, referral_code: e.target.value }))} placeholder="ABC12345" hint="Opcjonalnie — jeśli klientka została polecona" />

          <Textarea label="Notatki" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Uwagi, preferencje klientki..." rows={2} />
        </div>
      </Modal>
    </div>
  )
}
