'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { slugify } from '@/lib/utils'
import { Star, CheckCircle, Building2, Package, Scissors, User, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 0, title: 'Twój salon', icon: Building2, desc: 'Podstawowe informacje o salonie' },
  { id: 1, title: 'Zasoby', icon: Package, desc: 'Fotele, gabinety w salonie' },
  { id: 2, title: 'Usługi', icon: Scissors, desc: 'Co oferuje Twój salon' },
  { id: 3, title: 'Pracownik', icon: User, desc: 'Pierwszy pracownik widoczny w kalendarzu' },
  { id: 4, title: 'Gotowe!', icon: Rocket, desc: 'Twój salon jest skonfigurowany' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [salonId, setSalonId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Step 0 - Salon
  const [salonForm, setSalonForm] = useState({
    name: '', phone: '', city: '', address: '', description: ''
  })

  // Step 1 - Resources
  const [resources, setResources] = useState([
    { name: 'Fotel 1', type: 'fotel' }
  ])

  // Step 2 - Services
  const [services, setServices] = useState([
    { name: 'Strzyżenie', price: '80', duration: '60' },
  ])

  // Step 3 - Staff
  const [staffForm, setStaffForm] = useState({
    name: '', role: 'owner', color: '#7C3AED'
  })

  const COLORS = ['#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4']

  // ── Step 0: Save salon ──────────────────────────────────────
  const saveStep0 = async () => {
    if (!salonForm.name.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Sprawdź czy salon już istnieje
    const { data: existingSalon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
    if (existingSalon) { setSalonId(existingSalon.id); setLoading(false); setStep(1); return }

    const slug = slugify(salonForm.name) + '-' + Math.random().toString(36).substring(2, 6)

    const { data, error } = await supabase.from('salons').insert({
      owner_id: user.id,
      name: salonForm.name,
      slug,
      phone: salonForm.phone,
      city: salonForm.city,
      address: salonForm.address,
      description: salonForm.description,
      onboarding_step: 1,
    }).select().single()

    if (error) { alert('Błąd: ' + error.message); setLoading(false); return }

    // Create default SMS templates
    await supabase.from('sms_templates').insert([
      {
        salon_id: data.id,
        type: 'reminder',
        name: 'Przypomnienie o wizycie',
        content: 'Cześć {imie}! Przypominamy o wizycie jutro o {godzina} ({usluga}). Zmień lub odwołaj: {link}',
        hours_before: 24,
        is_active: true,
      },
      {
        salon_id: data.id,
        type: 'confirmation',
        name: 'Potwierdzenie rezerwacji',
        content: 'Cześć {imie}! Twoja wizyta {usluga} dnia {data} o {godzina} została potwierdzona. Do zobaczenia!',
        is_active: true,
      }
    ])

    // Create default referral settings
    await supabase.from('referral_settings').insert({
      salon_id: data.id,
      is_active: true,
      reward_type: 'amount',
      reward_referrer: 20,
      reward_new: 20,
    })

    setSalonId(data.id)
    setLoading(false)
    setStep(1)
  }

  // ── Step 1: Save resources ──────────────────────────────────
  const saveStep1 = async () => {
    if (!salonId) return
    setLoading(true)
    const validResources = resources.filter(r => r.name.trim())
    if (validResources.length > 0) {
      await supabase.from('resources').insert(
        validResources.map(r => ({ salon_id: salonId, name: r.name, type: r.type }))
      )
    }
    await supabase.from('salons').update({ onboarding_step: 2 }).eq('id', salonId)
    setLoading(false)
    setStep(2)
  }

  // ── Step 2: Save services ────────────────────────────────────
  const saveStep2 = async () => {
    if (!salonId) return
    setLoading(true)
    const validServices = services.filter(s => s.name.trim() && s.price)
    if (validServices.length > 0) {
      await supabase.from('services').insert(
        validServices.map(s => ({
          salon_id: salonId,
          name: s.name,
          price: parseFloat(s.price),
          duration_minutes: parseInt(s.duration),
        }))
      )
    }
    await supabase.from('salons').update({ onboarding_step: 3 }).eq('id', salonId)
    setLoading(false)
    setStep(3)
  }

  // ── Step 3: Save staff ───────────────────────────────────────
  const saveStep3 = async () => {
    if (!salonId) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (staffForm.name.trim()) {
      await supabase.from('staff').insert({
        salon_id: salonId,
        user_id: user?.id,
        name: staffForm.name,
        role: staffForm.role,
        color: staffForm.color,
        visible_in_calendar: true,
      })
    }

    await supabase.from('salons').update({ onboarding_step: 4, onboarding_completed: true }).eq('id', salonId)
    setLoading(false)
    setStep(4)
  }

  // ── Progress indicator ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">Referly</span>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  i < step ? 'bg-violet-600 text-white' : i === step ? 'bg-violet-600 text-white ring-4 ring-violet-100' : 'bg-gray-100 text-gray-400'
                )}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                {i < 3 && <div className={cn('w-10 h-0.5', i < step ? 'bg-violet-600' : 'bg-gray-200')} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          
          {/* ── STEP 0: Salon ── */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 rounded-xl"><Building2 className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Twój salon</h2>
                  <p className="text-sm text-gray-500">Podaj podstawowe informacje</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input label="Nazwa salonu" value={salonForm.name} onChange={e => setSalonForm(f => ({ ...f, name: e.target.value }))} placeholder="Salon Urody Karoliny" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Telefon" value={salonForm.phone} onChange={e => setSalonForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 600 000 000" />
                  <Input label="Miasto" value={salonForm.city} onChange={e => setSalonForm(f => ({ ...f, city: e.target.value }))} placeholder="Warszawa" />
                </div>
                <Input label="Adres" value={salonForm.address} onChange={e => setSalonForm(f => ({ ...f, address: e.target.value }))} placeholder="ul. Piękna 10, Warszawa" />
                <Textarea label="Opis salonu (opcjonalnie)" value={salonForm.description} onChange={e => setSalonForm(f => ({ ...f, description: e.target.value }))} placeholder="Kilka słów o Waszym salonie..." rows={2} />
              </div>
              <Button onClick={saveStep0} loading={loading} disabled={!salonForm.name.trim()} className="w-full mt-6" size="lg">
                Dalej →
              </Button>
            </div>
          )}

          {/* ── STEP 1: Resources ── */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 rounded-xl"><Package className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Zasoby</h2>
                  <p className="text-sm text-gray-500">Fotele, gabinety — system pilnuje żeby nie było kolizji</p>
                </div>
              </div>
              <div className="space-y-3">
                {resources.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={r.name}
                      onChange={e => setResources(rs => rs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Fotel 1"
                      className="flex-1"
                    />
                    <Select
                      options={[{ value: 'fotel', label: 'Fotel' }, { value: 'gabinet', label: 'Gabinet' }, { value: 'inne', label: 'Inne' }]}
                      value={r.type}
                      onChange={e => setResources(rs => rs.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                      className="w-32"
                    />
                    {resources.length > 1 && (
                      <button onClick={() => setResources(rs => rs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setResources(rs => [...rs, { name: `Fotel ${rs.length + 1}`, type: 'fotel' }])} className="text-sm text-violet-600 hover:underline">
                  + Dodaj zasób
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">Pomiń</Button>
                <Button onClick={saveStep1} loading={loading} className="flex-1" size="lg">Dalej →</Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Services ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 rounded-xl"><Scissors className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Usługi</h2>
                  <p className="text-sm text-gray-500">Co oferuje Twój salon? (możesz dodać więcej potem)</p>
                </div>
              </div>
              <div className="space-y-3">
                {services.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center flex-wrap">
                    <Input value={s.name} onChange={e => setServices(ss => ss.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Strzyżenie" className="flex-1 min-w-24" />
                    <div className="flex gap-2">
                      <div className="relative">
                        <Input value={s.price} onChange={e => setServices(ss => ss.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} placeholder="80" type="number" className="w-20 pr-6" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">zł</span>
                      </div>
                      <Select
                        options={[15,30,45,60,75,90,120,150,180].map(m => ({ value: String(m), label: `${m} min` }))}
                        value={s.duration}
                        onChange={e => setServices(ss => ss.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))}
                        className="w-28"
                      />
                      {services.length > 1 && (
                        <button onClick={() => setServices(ss => ss.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setServices(ss => [...ss, { name: '', price: '', duration: '60' }])} className="text-sm text-violet-600 hover:underline">
                  + Dodaj usługę
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">Pomiń</Button>
                <Button onClick={saveStep2} loading={loading} className="flex-1" size="lg">Dalej →</Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Staff ── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-violet-50 rounded-xl"><User className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pierwszy pracownik</h2>
                  <p className="text-sm text-gray-500">Pojawi się w kalendarzu. Możesz dodać więcej w ustawieniach.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input label="Imię i nazwisko" value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Karolina Nowak" />
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Kolor w kalendarzu</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setStaffForm(f => ({ ...f, color: c }))}
                        className={cn('w-8 h-8 rounded-full transition-all', staffForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={saveStep3} loading={loading} className="flex-1">Pomiń</Button>
                <Button onClick={saveStep3} loading={loading} disabled={!staffForm.name.trim()} className="flex-1" size="lg">Zapisz →</Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Rocket className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Salon gotowy! 🎉</h2>
              <p className="text-gray-500 mb-2">Twój salon <strong>{salonForm.name}</strong> jest skonfigurowany.</p>
              <p className="text-sm text-violet-600 font-medium mb-8">Masz 14 dni okresu próbnego + 30 SMS gratis</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                {[
                  { icon: '📅', title: 'Kalendarz', desc: 'Zarządzaj wizytami i terminami' },
                  { icon: '👤', title: 'Klienci', desc: 'Baza klientek z historią' },
                  { icon: '🎁', title: 'Polecenia', desc: 'Program lojalnościowy' },
                  { icon: '📊', title: 'Statystyki', desc: 'Pełne raporty i analytics' },
                ].map(item => (
                  <div key={item.title} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg mb-1">{item.icon}</p>
                    <p className="text-sm font-medium text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => router.push('/dashboard/pulpit')} className="w-full" size="lg">
                Otwórz pulpit →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
