'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, Avatar, Badge, EmptyState } from '@/components/ui/index'
import { Plus, Search, Phone, Mail, User, Star, Clock, TrendingUp, Gift, X, ChevronRight } from 'lucide-react'
import type { Client } from '@/types'

interface Props { salonId: string; initialClients: Client[] }

export function KlienciClient({ salonId, initialClients }: Props) {
  const supabase = createClient()
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Client | null>(null)
  const [clientAppts, setClientAppts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '', birthdate: ''
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email || '').toLowerCase().includes(q))
  }, [clients, search])

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').eq('salon_id', salonId).order('name')
    setClients(data || [])
  }

  const openClient = async (client: Client) => {
    setSelected(client)
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('*, service:services(name), staff:staff(name, color)')
      .eq('client_id', client.id)
      .order('starts_at', { ascending: false })
      .limit(20)
    setClientAppts(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return
    setFormLoading(true)

    const { error } = await supabase.from('clients').insert({
      salon_id: salonId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
      birthdate: form.birthdate || null,
    })

    if (!error) {
      await loadClients()
      setShowAdd(false)
      setForm({ name: '', phone: '', email: '', address: '', notes: '', birthdate: '' })
    }
    setFormLoading(false)
  }

  const STATUS_COLORS: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700',
    awaiting_deposit: 'bg-blue-100 text-blue-700', done: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600', no_show: 'bg-red-200 text-red-800',
  }
  const STATUS_LABELS: Record<string, string> = {
    confirmed: 'Potwierdzona', pending: 'Oczekuje', awaiting_deposit: 'Zadatek',
    done: 'Odbyta', cancelled: 'Anulowana', no_show: 'Nieobecność',
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klienci</h1>
          <p className="text-sm text-gray-500">{clients.length} klientek w bazie</p>
        </div>
        <Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>
          Dodaj klientkę
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj po imieniu, telefonie lub emailu..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
      </div>

      {/* Client list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<User className="w-16 h-16" />}
          title="Brak klientek"
          description={search ? 'Nie znaleziono pasujących klientek' : 'Dodaj pierwszą klientkę do bazy'}
          action={<Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Dodaj klientkę</Button>}
        />
      ) : (
        <div className="grid gap-2">
          {filtered.map(client => (
            <div
              key={client.id}
              onClick={() => openClient(client)}
              className="bg-white rounded-xl p-4 border border-gray-100 hover:border-violet-200 cursor-pointer flex items-center gap-4 transition-all hover:shadow-sm"
            >
              <Avatar name={client.name} color="#7C3AED" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  {client.no_show_count > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">{client.no_show_count}× nieobecność</span>
                  )}
                  {client.active_discount > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">
                      🏷️ Rabat {client.active_discount}{client.active_discount_type === 'percent' ? '%' : ' zł'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                  {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
                  {client.last_visit_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Ostatnia: {formatDate(client.last_visit_at)}</span>}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(client.total_spent)}</p>
                <p className="text-xs text-gray-400">{client.visit_count} wizyt</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Add client modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Dodaj klientkę" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Anuluj</Button>
          <Button onClick={handleSave} loading={formLoading}>Dodaj klientkę</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="Imię i nazwisko" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Anna Kowalska" required />
          <Input label="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 600 000 000" required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="anna@email.pl" />
          <Input label="Adres" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ul. Kwiatowa 5, Warszawa" />
          <Input label="Data urodzin" type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
          <Textarea label="Notatki" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Preferencje, alergie, uwagi..." rows={2} />
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            💡 Kod polecający zostanie automatycznie wygenerowany po dodaniu klientki.
          </p>
        </div>
      </Modal>

      {/* Client profile slide-over */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-xl shadow-2xl overflow-y-auto">
            {/* Profile header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
              <Avatar name={selected.name} color="#7C3AED" size="lg" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-violet-700">{formatCurrency(selected.total_spent)}</p>
                  <p className="text-xs text-violet-500">Łącznie wydała</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{selected.visit_count}</p>
                  <p className="text-xs text-blue-500">Wizyt</p>
                </div>
                <div className={cn('rounded-xl p-3 text-center', selected.no_show_count > 0 ? 'bg-red-50' : 'bg-green-50')}>
                  <p className={cn('text-xl font-bold', selected.no_show_count > 0 ? 'text-red-600' : 'text-green-600')}>{selected.no_show_count}</p>
                  <p className={cn('text-xs', selected.no_show_count > 0 ? 'text-red-400' : 'text-green-400')}>Nieobecności</p>
                </div>
              </div>

              {/* Referral code */}
              {selected.referral_code && (
                <div className="bg-violet-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-violet-600" />
                    <p className="text-sm font-semibold text-violet-800">Link polecający</p>
                  </div>
                  <code className="text-xs bg-white text-violet-700 px-2 py-1 rounded border border-violet-200 block mb-2">
                    referly.pl/p/{selected.referral_code}
                  </code>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(`https://referly.pl/p/${selected.referral_code}`)}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Kopiuj link
                    </button>
                  </div>
                </div>
              )}

              {/* Discount */}
              {selected.active_discount > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-800">🏷️ Aktywny rabat</p>
                  <p className="text-xl font-bold text-green-700 mt-1">{selected.active_discount}{selected.active_discount_type === 'percent' ? '%' : ' zł'}</p>
                  {selected.discount_expires_at && <p className="text-xs text-green-500">Ważny do: {formatDate(selected.discount_expires_at)}</p>}
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Kontakt</h3>
                {selected.email && <p className="text-sm text-gray-600 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</p>}
                {selected.address && <p className="text-sm text-gray-600">{selected.address}</p>}
                {selected.notes && <p className="text-sm text-gray-500 italic">{selected.notes}</p>}
              </div>

              {/* Visit history */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Historia wizyt</h3>
                {loading ? (
                  <div className="text-center py-4 text-gray-400 text-sm">Ładowanie...</div>
                ) : clientAppts.length === 0 ? (
                  <p className="text-sm text-gray-400">Brak historii wizyt</p>
                ) : (
                  <div className="space-y-2">
                    {clientAppts.map(appt => (
                      <div key={appt.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: appt.staff?.color || '#ccc' }} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{appt.service?.name}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(appt.starts_at)} · {appt.staff?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">{formatCurrency(appt.price)}</p>
                          <span className={({'confirmed':'bg-green-100 text-green-700','done':'bg-gray-100 text-gray-600','cancelled':'bg-red-100 text-red-600','no_show':'bg-red-200 text-red-800','pending':'bg-yellow-100 text-yellow-700'} as Record<string,string>)[appt.status] || 'bg-gray-100 text-gray-600'}>
                            {appt.status === 'done' ? 'Odbyta' : appt.status === 'cancelled' ? 'Anulowana' : appt.status === 'no_show' ? 'Nieobecność' : appt.status === 'confirmed' ? 'Potwierdzona' : 'Oczekuje'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
