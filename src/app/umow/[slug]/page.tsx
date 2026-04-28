'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { cn, formatCurrency, minutesToHHMM } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Star, ChevronLeft, ChevronRight, CheckCircle, Clock, User } from 'lucide-react'

export default function BookingPage({ params }: { params: any }) {
  const supabase = createClient()
  const slug = params.slug
  const [salon, setSalon] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [booked, setBooked] = useState(false)
  const [calOffset, setCalOffset] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: salonData } = await supabase.from('salons').select('*').eq('slug', slug).eq('is_active', true).single()
      if (!salonData) { setLoading(false); return }
      setSalon(salonData)
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('services').select('*').eq('salon_id', salonData.id).eq('is_active', true).eq('is_online_bookable', true).order('name'),
        supabase.from('staff').select('id, name, color, photo_url').eq('salon_id', salonData.id).eq('is_active', true).eq('can_be_booked_online', true).order('name'),
      ])
      setServices(svcs || [])
      setStaff(stf || [])
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!selectedDate || !selectedService || !salon) return
    const loadSlots = async () => {
      const dayStr = format(selectedDate, 'yyyy-MM-dd')
      const { data: existing } = await supabase
        .from('appointments')
        .select('starts_at, ends_at')
        .eq('salon_id', salon.id)
        .gte('starts_at', `${dayStr}T00:00:00`)
        .lte('starts_at', `${dayStr}T23:59:59`)
        .not('status', 'in', '("cancelled","no_show")')
      const slots: string[] = []
      const interval = salon.booking_slot_interval || 15
      const duration = selectedService.duration_minutes
      for (let h = 8; h < 19; h++) {
        for (let m = 0; m < 60; m += interval) {
          const slotStart = new Date(selectedDate)
          slotStart.setHours(h, m, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + duration * 60000)
          if (isBefore(slotStart, new Date())) continue
          const conflict = (existing || []).some(a => {
            const aStart = new Date(a.starts_at)
            const aEnd = new Date(a.ends_at)
            return slotStart < aEnd && slotEnd > aStart
          })
          if (!conflict) slots.push(format(slotStart, 'HH:mm'))
          if (slots.length >= 20) break
        }
        if (slots.length >= 20) break
      }
      setAvailableSlots(slots)
    }
    loadSlots()
  }, [selectedDate, selectedService, salon])

  const handleBook = async () => {
    if (!salon || !selectedService || !selectedDate || !selectedTime || !clientForm.name || !clientForm.phone) return
    setSubmitting(true)
    const [h, m] = selectedTime.split(':').map(Number)
    const starts = new Date(selectedDate)
    starts.setHours(h, m, 0, 0)
    const ends = new Date(starts.getTime() + selectedService.duration_minutes * 60000)
    await supabase.from('appointments').insert({
      salon_id: salon.id,
      staff_id: selectedStaff?.id || staff[0]?.id,
      service_id: selectedService.id,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      price: selectedService.price,
      original_price: selectedService.price,
      discount: 0,
      status: 'pending',
      source: 'online',
      client_name: clientForm.name,
      client_phone: clientForm.phone,
      notes: clientForm.notes || null,
    })
    setSubmitting(false)
    setBooked(true)
  }

  const calDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + calOffset * 14))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-gray-200 border-t-violet-600 w-8 h-8" />
    </div>
  )

  if (!salon) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Salon nie istnieje</div>
  )

  if (booked) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Wizyta zarezerwowana!</h2>
        <p className="text-gray-500 text-sm">
          <strong>{selectedService?.name}</strong> · {selectedDate && format(selectedDate, 'dd.MM.yyyy')} o {selectedTime}
        </p>
        <p className="text-xs text-gray-400 mt-3">Salon potwierdzi wizytę SMS-em.</p>
        <Button onClick={() => window.location.href = `/salon/${slug}`} variant="secondary" className="mt-6 w-full">
          Wróć do strony salonu
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          {salon.logo_url && <img src={salon.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{salon.name}</p>
            <p className="text-xs text-gray-500">Rezerwacja online</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-violet-600' : 'bg-gray-200')} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Wybierz usługę</h2>
            <div className="space-y-2">
              {services.map(svc => (
                <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(2) }}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-violet-200 hover:bg-violet-50/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{svc.name}</p>
                      {svc.description && <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">{formatCurrency(svc.price)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-end">
                        <Clock className="w-3 h-3" />{minutesToHHMM(svc.duration_minutes)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" />Zmień usługę
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Wybierz datę</h2>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCalOffset(o => Math.max(0, o - 1))} disabled={calOffset === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 capitalize">{format(calDays[0], 'MMMM yyyy', { locale: pl })}</span>
              <button onClick={() => setCalOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
              ))}
              {calDays.map(day => {
                const isPast = isBefore(day, startOfDay(new Date()))
                const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                return (
                  <button key={day.toISOString()} disabled={isPast}
                    onClick={() => { setSelectedDate(day); setStep(3) }}
                    className={cn('aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center',
                      isPast ? 'opacity-20 cursor-not-allowed' : '',
                      isSelected ? 'bg-violet-600 text-white' : 'hover:bg-violet-50 text-gray-700'
                    )}>
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" />Zmień datę
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Wybierz godzinę</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedDate && format(selectedDate, 'EEEE, d MMMM', { locale: pl })}</p>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Brak wolnych terminów w tym dniu</p>
                <button onClick={() => setStep(2)} className="mt-3 text-sm text-violet-600 hover:underline">Wybierz inny dzień</button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map(slot => (
                  <button key={slot} onClick={() => { setSelectedTime(slot); setStep(4) }}
                    className={cn('py-2.5 rounded-xl text-sm font-medium border transition-all',
                      selectedTime === slot ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
                    )}>
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" />Zmień godzinę
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Wybierz pracownika</h2>
            <div className="space-y-2">
              <button onClick={() => { setSelectedStaff(null); setStep(5) }}
                className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-violet-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Dowolny pracownik</p>
                    <p className="text-xs text-gray-500">Pierwszy dostępny</p>
                  </div>
                </div>
              </button>
              {staff.map(s => (
                <button key={s.id} onClick={() => { setSelectedStaff(s); setStep(5) }}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-violet-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: s.color }}>
                      {s.name.charAt(0)}
                    </div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <button onClick={() => setStep(4)} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-violet-600">
              <ChevronLeft className="w-4 h-4" />Wróć
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Twoje dane</h2>
            <div className="bg-violet-50 rounded-xl p-4 mb-5">
              <p className="text-sm font-medium text-violet-800">{selectedService?.name}</p>
              <p className="text-xs text-violet-600">
                {selectedDate && format(selectedDate, 'dd.MM.yyyy')} o {selectedTime} · {selectedStaff?.name || 'Dowolny pracownik'}
              </p>
              <p className="text-xs text-violet-600">{formatCurrency(selectedService?.price)}</p>
            </div>
            <div className="space-y-3">
              <Input label="Imię i nazwisko" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} placeholder="Anna Kowalska" required />
              <Input label="Numer telefonu" type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 600 000 000" required />
              <Input label="Email" type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} placeholder="anna@email.pl" />
              <Input label="Uwagi" value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcjonalnie..." />
            </div>
            <Button onClick={handleBook} loading={submitting} disabled={!clientForm.name || !clientForm.phone} className="w-full mt-5" size="lg">
              Zarezerwuj wizytę →
            </Button>
            <p className="text-xs text-gray-400 text-center mt-2">Salon potwierdzi wizytę telefonicznie lub SMS-em</p>
          </div>
        )}
      </div>
    </div>
  )
}
