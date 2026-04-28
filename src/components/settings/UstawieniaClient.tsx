'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, slugify } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, Toggle, Badge, Avatar } from '@/components/ui/index'
import { Building2, Users, Scissors, Package, CreditCard, Edit2, Plus, Trash2, CheckCircle, Camera } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'

const TABS = [
  { id: 'salon', label: 'Salon', icon: Building2 },
  { id: 'hours', label: 'Godziny', icon: CheckCircle },
  { id: 'portfolio', label: 'Portfolio', icon: Camera },
  { id: 'staff', label: 'Pracownicy', icon: Users },
  { id: 'services', label: 'Usługi', icon: Scissors },
  { id: 'resources', label: 'Zasoby', icon: Package },
  { id: 'deposit', label: 'Zadatek', icon: CreditCard },
]

const COLORS = ['#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']
const DAY_NAMES = ['', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']

export function UstawieniaClient({ salon: initialSalon, staff: initialStaff, services: initialServices, resources: initialResources }: any) {
  const supabase = createClient()
  const [tab, setTab] = useState('salon')
  const [salon, setSalon] = useState(initialSalon)
  const [staff, setStaff] = useState(initialStaff)
  const [services, setServices] = useState(initialServices)
  const [resources, setResources] = useState(initialResources)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Modals
  const [showStaff, setShowStaff] = useState(false)
  const [showService, setShowService] = useState(false)
  const [showResource, setShowResource] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [editingService, setEditingService] = useState<any>(null)
  const [editingResource, setEditingResource] = useState<any>(null)

  const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', role: 'employee', color: '#7C3AED', commission_percent: '0', can_be_booked_online: true, photo_url: '' })
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', price_max: '', duration_minutes: '60', category: '', is_online_bookable: true })
  const [resourceForm, setResourceForm] = useState({ name: '', type: 'fotel', description: '' })

  const saveSalonBasic = async () => {
    setSaving(true)
    await supabase.from('salons').update({
      name: salon.name, phone: salon.phone, email: salon.email,
      address: salon.address, city: salon.city, website: salon.website, description: salon.description,
    }).eq('id', salon.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const saveHours = async () => {
    setSaving(true)
    await supabase.from('salons').update({ opening_hours: salon.opening_hours }).eq('id', salon.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const updateHour = (day: string, field: string, value: any) => {
    setSalon((s: any) => ({ ...s, opening_hours: { ...s.opening_hours, [day]: { ...s.opening_hours[day], [field]: value } } }))
  }

  const saveDeposit = async () => {
    setSaving(true)
    await supabase.from('salons').update({ deposit_enabled: salon.deposit_enabled, deposit_after_no_shows: salon.deposit_after_no_shows, deposit_blik_number: salon.deposit_blik_number, deposit_amount: salon.deposit_amount, deposit_no_refund_hours: salon.deposit_no_refund_hours, deposit_terms: salon.deposit_terms }).eq('id', salon.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Staff CRUD
  const loadStaff = async () => { const { data } = await supabase.from('staff').select('*').eq('salon_id', salon.id).order('name'); setStaff(data || []) }
  const openAddStaff = () => { setEditingStaff(null); setStaffForm({ name: '', email: '', phone: '', role: 'employee', color: '#7C3AED', commission_percent: '0', can_be_booked_online: true, photo_url: '' }); setShowStaff(true) }
  const openEditStaff = (s: any) => { setEditingStaff(s); setStaffForm({ name: s.name, email: s.email || '', phone: s.phone || '', role: s.role, color: s.color, commission_percent: String(s.commission_percent), can_be_booked_online: s.can_be_booked_online, photo_url: s.photo_url || '' }); setShowStaff(true) }
  const saveStaff = async () => {
    const payload = { salon_id: salon.id, name: staffForm.name, email: staffForm.email || null, phone: staffForm.phone || null, role: staffForm.role, color: staffForm.color, commission_percent: parseFloat(staffForm.commission_percent), can_be_booked_online: staffForm.can_be_booked_online, photo_url: staffForm.photo_url || null }
    if (editingStaff) { await supabase.from('staff').update(payload).eq('id', editingStaff.id) } else { await supabase.from('staff').insert(payload) }
    await loadStaff(); setShowStaff(false)
  }
  const deleteStaff = async (id: string) => { if (!confirm('Usunąć pracownika?')) return; await supabase.from('staff').update({ is_active: false }).eq('id', id); await loadStaff() }

  // Services CRUD
  const loadServices = async () => { const { data } = await supabase.from('services').select('*').eq('salon_id', salon.id).order('name'); setServices(data || []) }
  const openAddService = () => { setEditingService(null); setServiceForm({ name: '', description: '', price: '', price_max: '', duration_minutes: '60', category: '', is_online_bookable: true }); setShowService(true) }
  const openEditService = (s: any) => { setEditingService(s); setServiceForm({ name: s.name, description: s.description || '', price: String(s.price), price_max: s.price_max ? String(s.price_max) : '', duration_minutes: String(s.duration_minutes), category: s.category || '', is_online_bookable: s.is_online_bookable }); setShowService(true) }
  const saveService = async () => {
    const payload = { salon_id: salon.id, name: serviceForm.name, description: serviceForm.description || null, price: parseFloat(serviceForm.price), price_max: serviceForm.price_max ? parseFloat(serviceForm.price_max) : null, duration_minutes: parseInt(serviceForm.duration_minutes), category: serviceForm.category || null, is_online_bookable: serviceForm.is_online_bookable }
    if (editingService) { await supabase.from('services').update(payload).eq('id', editingService.id) } else { await supabase.from('services').insert(payload) }
    await loadServices(); setShowService(false)
  }
  const deleteService = async (id: string) => { if (!confirm('Usunąć usługę?')) return; await supabase.from('services').update({ is_active: false }).eq('id', id); await loadServices() }

  // Resources CRUD
  const loadResources = async () => { const { data } = await supabase.from('resources').select('*').eq('salon_id', salon.id).order('name'); setResources(data || []) }
  const saveResource = async () => {
    const payload = { salon_id: salon.id, name: resourceForm.name, type: resourceForm.type, description: resourceForm.description || null }
    if (editingResource) { await supabase.from('resources').update(payload).eq('id', editingResource.id) } else { await supabase.from('resources').insert(payload) }
    await loadResources(); setShowResource(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Ustawienia</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all', tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Salon basic */}
      {tab === 'salon' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Dane salonu</h2>
          <div className="space-y-4">

            {/* Zdjęcia salonu */}
            <div className="pb-4 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">Zdjęcia</p>
              <div className="flex gap-6 flex-wrap">
                <div className="flex flex-col items-center gap-1.5">
                  <ImageUpload
                    currentUrl={salon.logo_url}
                    onUpload={url => setSalon((s: any) => ({ ...s, logo_url: url }))}
                    bucket="salon-media"
                    folder="logos"
                    size="md"
                    shape="square"
                    placeholder="Logo"
                  />
                  <span className="text-xs text-gray-500">Logo</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <ImageUpload
                    currentUrl={salon.hero_image_url}
                    onUpload={url => setSalon((s: any) => ({ ...s, hero_image_url: url }))}
                    bucket="salon-media"
                    folder="heroes"
                    size="md"
                    shape="square"
                    placeholder="Baner"
                  />
                  <span className="text-xs text-gray-500">Baner główny</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Baner wyświetla się jako duże zdjęcie u góry strony salonu
              </p>
            </div>

            <Input label="Nazwa salonu" value={salon.name} onChange={e => setSalon((s: any) => ({ ...s, name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Telefon" value={salon.phone || ''} onChange={e => setSalon((s: any) => ({ ...s, phone: e.target.value }))} />
              <Input label="Email" type="email" value={salon.email || ''} onChange={e => setSalon((s: any) => ({ ...s, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Adres" value={salon.address || ''} onChange={e => setSalon((s: any) => ({ ...s, address: e.target.value }))} />
              <Input label="Miasto" value={salon.city || ''} onChange={e => setSalon((s: any) => ({ ...s, city: e.target.value }))} />
            </div>
            <Input label="Strona WWW" value={salon.website || ''} onChange={e => setSalon((s: any) => ({ ...s, website: e.target.value }))} placeholder="https://twojsalon.pl" />
            <Textarea label="Opis salonu" value={salon.description || ''} onChange={e => setSalon((s: any) => ({ ...s, description: e.target.value }))} rows={3} />
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Link do strony Twojego salonu: <span className="text-violet-600">referly.pl/salon/{salon.slug}</span></p>
            </div>
            <Button onClick={saveSalonBasic} loading={saving} icon={saved ? <CheckCircle className="w-4 h-4" /> : undefined}>
              {saved ? 'Zapisano!' : 'Zapisz zmiany'}
            </Button>
          </div>
        </Card>
      )}

      {/* Hours */}
      {tab === 'hours' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Godziny otwarcia</h2>
          <div className="space-y-3">
            {[1,2,3,4,5,6,7].map(d => {
              const day = salon.opening_hours?.[d] || { is_open: d <= 5, open: '09:00', close: '18:00' }
              return (
                <div key={d} className="flex items-center gap-4">
                  <div className="w-28 flex items-center gap-2">
                    <Toggle checked={day.is_open} onChange={v => updateHour(String(d), 'is_open', v)} />
                    <span className="text-sm text-gray-700">{DAY_NAMES[d]}</span>
                  </div>
                  {day.is_open ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={day.open} onChange={e => updateHour(String(d), 'open', e.target.value)} className="w-28" />
                      <span className="text-gray-400">–</span>
                      <Input type="time" value={day.close} onChange={e => updateHour(String(d), 'close', e.target.value)} className="w-28" />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Zamknięte</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Button onClick={saveHours} loading={saving} icon={saved ? <CheckCircle className="w-4 h-4" /> : undefined}>
              {saved ? 'Zapisano!' : 'Zapisz godziny'}
            </Button>
          </div>
        </Card>
      )}

      {/* Portfolio */}
      {tab === 'portfolio' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-1">Portfolio / Galeria</h2>
          <p className="text-sm text-gray-500 mb-4">Zdjęcia wyświetlają się na publicznej stronie salonu. Kliknij + aby dodać.</p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {/* Istniejące zdjęcia */}
            {(salon.gallery_urls || []).map((url: string, i: number) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    const updated = [...(salon.gallery_urls || [])]
                    updated.splice(i, 1)
                    setSalon((s: any) => ({ ...s, gallery_urls: updated }))
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Przycisk dodawania */}
            <div className="aspect-square">
              <ImageUpload
                onUpload={url => {
                  if (url) setSalon((s: any) => ({ ...s, gallery_urls: [...(s.gallery_urls || []), url] }))
                }}
                bucket="salon-media"
                folder="gallery"
                size="md"
                shape="square"
                placeholder="Dodaj"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Masz {(salon.gallery_urls || []).length} zdjęć w galerii. Aby zapisać zmiany kolejności lub usunięcia — kliknij Zapisz.
          </p>

          <Button
            onClick={async () => {
              setSaving(true)
              await supabase.from('salons').update({ gallery_urls: salon.gallery_urls || [] }).eq('id', salon.id)
              setSaving(false)
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }}
            loading={saving}
            icon={saved ? <CheckCircle className="w-4 h-4" /> : undefined}
          >
            {saved ? 'Zapisano!' : 'Zapisz galerię'}
          </Button>
        </Card>
      )}

      {/* Staff */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddStaff} icon={<Plus className="w-4 h-4" />}>Dodaj pracownika</Button>
          </div>
          {staff.filter((s: any) => s.is_active).map((s: any) => (
            <Card key={s.id}>
              <div className="flex items-center gap-4">
                <Avatar name={s.name} color={s.color} photo={s.photo_url} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <Badge variant="default">{s.role}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{s.email || s.phone || '—'}</p>
                  {s.commission_percent > 0 && <p className="text-xs text-gray-400">Prowizja: {s.commission_percent}%</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditStaff(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteStaff(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Services */}
      {tab === 'services' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={openAddService} icon={<Plus className="w-4 h-4" />}>Dodaj usługę</Button>
          </div>
          {services.filter((s: any) => s.is_active).map((s: any) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:border-gray-200">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {s.category && <Badge variant="default">{s.category}</Badge>}
                </div>
                <p className="text-sm text-gray-500">{s.price} zł · {s.duration_minutes} min</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditService(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteService(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resources */}
      {tab === 'resources' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingResource(null); setResourceForm({ name: '', type: 'fotel', description: '' }); setShowResource(true) }} icon={<Plus className="w-4 h-4" />}>Dodaj zasób</Button>
          </div>
          {resources.filter((r: any) => r.is_active).map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-sm text-gray-500 capitalize">{r.type}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingResource(r); setResourceForm({ name: r.name, type: r.type, description: r.description || '' }); setShowResource(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                <button onClick={async () => { if (!confirm('Usunąć zasób?')) return; await supabase.from('resources').update({ is_active: false }).eq('id', r.id); loadResources() }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deposit */}
      {tab === 'deposit' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Ustawienia zadatku</h2>
          <div className="space-y-4">
            <Toggle checked={salon.deposit_enabled} onChange={v => setSalon((s: any) => ({ ...s, deposit_enabled: v }))} label="Włącz system zadatku" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kwota zadatku (zł)" type="number" value={salon.deposit_amount || ''} onChange={e => setSalon((s: any) => ({ ...s, deposit_amount: e.target.value }))} />
              <Input label="Wymagaj po ilu nieobecnościach" type="number" value={salon.deposit_after_no_shows || 2} onChange={e => setSalon((s: any) => ({ ...s, deposit_after_no_shows: e.target.value }))} />
            </div>
            <Input label="Numer BLIK do wpłaty" value={salon.deposit_blik_number || ''} onChange={e => setSalon((s: any) => ({ ...s, deposit_blik_number: e.target.value }))} placeholder="600 000 000" />
            <Input label="Bez zwrotu jeśli anulacja w ciągu (godz.)" type="number" value={salon.deposit_no_refund_hours || 24} onChange={e => setSalon((s: any) => ({ ...s, deposit_no_refund_hours: e.target.value }))} />
            <Textarea label="Regulamin zadatku" value={salon.deposit_terms || ''} onChange={e => setSalon((s: any) => ({ ...s, deposit_terms: e.target.value }))} rows={3} placeholder="Treść regulaminu zadatku widoczna dla klientek..." />
            <Button onClick={saveDeposit} loading={saving} icon={saved ? <CheckCircle className="w-4 h-4" /> : undefined}>
              {saved ? 'Zapisano!' : 'Zapisz ustawienia'}
            </Button>
          </div>
        </Card>
      )}

      {/* Staff Modal */}
      <Modal open={showStaff} onClose={() => setShowStaff(false)} title={editingStaff ? 'Edytuj pracownika' : 'Nowy pracownik'}
        footer={<><Button variant="ghost" onClick={() => setShowStaff(false)}>Anuluj</Button><Button onClick={saveStaff}>Zapisz</Button></>}>
        <div className="space-y-4">
          {/* Zdjęcie pracownika */}
          <div className="flex flex-col items-center pb-2 border-b border-gray-100">
            <ImageUpload
              currentUrl={staffForm.photo_url}
              onUpload={url => setStaffForm(f => ({ ...f, photo_url: url }))}
              bucket="avatars"
              folder="staff"
              size="lg"
              shape="circle"
              placeholder="Dodaj zdjęcie"
            />
          </div>
          <Input label="Imię i nazwisko" value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Telefon" value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Rola" value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))} options={[{ value: 'owner', label: 'Właściciel' }, { value: 'admin', label: 'Admin' }, { value: 'employee', label: 'Pracownik' }, { value: 'receptionist', label: 'Recepcja' }]} />
            <Input label="Prowizja (%)" type="number" value={staffForm.commission_percent} onChange={e => setStaffForm(f => ({ ...f, commission_percent: e.target.value }))} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Kolor w kalendarzu</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setStaffForm(f => ({ ...f, color: c }))} className={cn('w-8 h-8 rounded-full', staffForm.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : '')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <Toggle checked={staffForm.can_be_booked_online} onChange={v => setStaffForm(f => ({ ...f, can_be_booked_online: v }))} label="Widoczny w rezerwacji online" />
        </div>
      </Modal>

      {/* Service Modal */}
      <Modal open={showService} onClose={() => setShowService(false)} title={editingService ? 'Edytuj usługę' : 'Nowa usługa'}
        footer={<><Button variant="ghost" onClick={() => setShowService(false)}>Anuluj</Button><Button onClick={saveService}>Zapisz</Button></>}>
        <div className="space-y-4">
          <Input label="Nazwa usługi" value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Cena (zł)" type="number" value={serviceForm.price} onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))} required />
            <Input label="Max cena (zł)" type="number" value={serviceForm.price_max} onChange={e => setServiceForm(f => ({ ...f, price_max: e.target.value }))} hint="Dla widełek" />
            <Select label="Czas" value={serviceForm.duration_minutes} onChange={e => setServiceForm(f => ({ ...f, duration_minutes: e.target.value }))} options={[15,30,45,60,75,90,120,150,180].map(m => ({ value: String(m), label: `${m} min` }))} />
          </div>
          <Input label="Kategoria" value={serviceForm.category} onChange={e => setServiceForm(f => ({ ...f, category: e.target.value }))} placeholder="Np. Strzyżenie, Koloryzacja" />
          <Textarea label="Opis" value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Toggle checked={serviceForm.is_online_bookable} onChange={v => setServiceForm(f => ({ ...f, is_online_bookable: v }))} label="Dostępna w rezerwacji online" />
        </div>
      </Modal>

      {/* Resource Modal */}
      <Modal open={showResource} onClose={() => setShowResource(false)} title={editingResource ? 'Edytuj zasób' : 'Nowy zasób'}
        footer={<><Button variant="ghost" onClick={() => setShowResource(false)}>Anuluj</Button><Button onClick={saveResource}>Zapisz</Button></>}>
        <div className="space-y-4">
          <Input label="Nazwa" value={resourceForm.name} onChange={e => setResourceForm(f => ({ ...f, name: e.target.value }))} placeholder="Fotel 1" required />
          <Select label="Typ" value={resourceForm.type} onChange={e => setResourceForm(f => ({ ...f, type: e.target.value }))} options={[{ value: 'fotel', label: 'Fotel' }, { value: 'gabinet', label: 'Gabinet' }, { value: 'myjnia', label: 'Myjnia' }, { value: 'inne', label: 'Inne' }]} />
          <Input label="Opis" value={resourceForm.description} onChange={e => setResourceForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}
