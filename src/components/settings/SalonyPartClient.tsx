'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, EmptyState, Badge } from '@/components/ui/index'
import { Store, Plus, Edit2, Star, Copy, CheckCircle, ExternalLink } from 'lucide-react'

interface Props { salonId: string; initialPartners: any[]; salonSlug?: string }

export function SalonyPartClient({ salonId, initialPartners, salonSlug = '' }: Props) {
  const supabase = createClient()
  const [partners, setPartners] = useState(initialPartners)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({
    partner_name: '', contact_name: '', contact_phone: '', contact_email: '', address: '',
    discount_type: 'percent', discount_value: '0', points_per_visit: '0', notes: '',
    partner_slug: '', // slug salonu partnerskiego do linku
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referly.pl'

  const load = async () => {
    const { data } = await supabase.from('partner_salons').select('*').eq('salon_id', salonId).order('partner_name')
    setPartners(data || [])
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ partner_name: '', contact_name: '', contact_phone: '', contact_email: '', address: '', discount_type: 'percent', discount_value: '0', points_per_visit: '0', notes: '', partner_slug: '' })
    setShowModal(true)
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ partner_name: p.partner_name, contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', contact_email: p.contact_email || '', address: p.address || '', discount_type: p.discount_type, discount_value: String(p.discount_value), points_per_visit: String(p.points_per_visit), notes: p.notes || '', partner_slug: p.partner_slug || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.partner_name.trim()) return
    setLoading(true)
    const payload = { ...form, salon_id: salonId, discount_value: parseFloat(form.discount_value), points_per_visit: parseInt(form.points_per_visit) }
    if (editing) {
      await supabase.from('partner_salons').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('partner_salons').insert(payload)
    }
    await load()
    setShowModal(false)
    setLoading(false)
  }

  const addPoints = async (id: string, pts: number) => {
    const p = partners.find((x: any) => x.id === id)
    if (!p) return
    await supabase.from('partner_salons').update({ points_balance: p.points_balance + pts }).eq('id', id)
    await load()
  }

  const copyLink = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  // Link do strony salonu partnerskiego
  const getProfileLink = (p: any) => p.partner_slug ? `${appUrl}/salon/${p.partner_slug}` : null
  // Link z rabatem dla klientek salonu partnerskiego (kieruje do naszego salonu)
  const getDiscountLink = (p: any) => salonSlug ? `${appUrl}/umow/${salonSlug}?partner=${p.id}` : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salony partnerskie</h1>
          <p className="text-sm text-gray-500">Partnerstwa, punkty i rabaty</p>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Dodaj salon</Button>
      </div>

      {partners.length === 0 ? (
        <EmptyState icon={<Store className="w-16 h-16" />} title="Brak salonów partnerskich" description="Dodaj pierwsze partnerstwo" action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Dodaj salon</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {partners.map((p: any) => {
            const profileLink = getProfileLink(p)
            const discountLink = getDiscountLink(p)
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.partner_name}</h3>
                    {p.address && <p className="text-xs text-gray-500 mt-0.5">{p.address}</p>}
                  </div>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {p.contact_name && <p className="text-sm text-gray-600">👤 {p.contact_name} {p.contact_phone && `· ${p.contact_phone}`}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {p.discount_value > 0 && (
                      <Badge variant="purple">Rabat {p.discount_value}{p.discount_type === 'percent' ? '%' : ' zł'}</Badge>
                    )}
                    {p.points_per_visit > 0 && (
                      <Badge variant="success">{p.points_per_visit} pkt/wizyta</Badge>
                    )}
                  </div>
                </div>

                {/* Linki */}
                <div className="space-y-1.5 mb-3">
                  {profileLink && (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-600 truncate flex-1">Profil salonu</span>
                      <div className="flex gap-1">
                        <a href={profileLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-600 hover:underline">Otwórz</a>
                        <span className="text-gray-300">·</span>
                        <button onClick={() => copyLink(profileLink, `profile-${p.id}`)}
                          className="text-xs text-gray-500 hover:text-violet-600 flex items-center gap-0.5">
                          {copied === `profile-${p.id}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copied === `profile-${p.id}` ? 'Skopiowano' : 'Kopiuj'}
                        </button>
                      </div>
                    </div>
                  )}
                  {discountLink && (
                    <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2">
                      <span className="text-xs">🎁</span>
                      <span className="text-xs text-violet-700 truncate flex-1">Link z rabatem dla klientek</span>
                      <div className="flex gap-1">
                        <a href={discountLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-600 hover:underline">Test</a>
                        <span className="text-violet-300">·</span>
                        <button onClick={() => copyLink(discountLink, `discount-${p.id}`)}
                          className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                          {copied === `discount-${p.id}` ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copied === `discount-${p.id}` ? 'Skopiowano!' : 'Kopiuj'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!p.partner_slug && (
                    <p className="text-xs text-gray-400 italic px-1">
                      Dodaj slug salonu partnerskiego aby wygenerować linki
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">{p.points_balance} pkt</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addPoints(p.id, p.points_per_visit || 1)}>
                      +{p.points_per_visit || 1} pkt
                    </Button>
                    {p.last_settlement_at && (
                      <span className="text-xs text-gray-400 self-center">
                        Rozliczono: {formatDate(p.last_settlement_at)}
                      </span>
                    )}
                  </div>
                </div>
                {p.notes && <p className="text-xs text-gray-400 mt-2 italic">{p.notes}</p>}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Edytuj salon partnerski' : 'Nowy salon partnerski'}
        footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Button><Button onClick={save} loading={loading}>Zapisz</Button></>}>
        <div className="space-y-4">
          <Input label="Nazwa salonu" value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} required />
          <Input label="Slug salonu (do linku)" value={form.partner_slug} onChange={e => setForm(f => ({ ...f, partner_slug: e.target.value }))} placeholder="np. salon-kasi-warszawa" hint="Część adresu URL strony salonu partnerskiego w Referly" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Osoba kontaktowa" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
            <Input label="Telefon" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          <Input label="Adres" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Typ rabatu" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} options={[{ value: 'percent', label: 'Procent (%)' }, { value: 'amount', label: 'Kwota (zł)' }]} />
            <Input label="Wartość rabatu" type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} />
          </div>
          <Input label="Punkty za wizytę" type="number" value={form.points_per_visit} onChange={e => setForm(f => ({ ...f, points_per_visit: e.target.value }))} hint="0 = brak systemu punktowego" />
          <Textarea label="Notatki" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </Modal>
    </div>
  )
}

