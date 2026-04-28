'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, Badge, EmptyState } from '@/components/ui/index'
import { Package, Plus, AlertTriangle, Edit2, History, Search } from 'lucide-react'

interface Props { salonId: string; initialItems: any[]; services: any[] }

const UNITS = ['szt', 'ml', 'l', 'g', 'kg', 'opak.', 'tubka', 'flak.']
const CATEGORIES = ['Farby', 'Odżywki', 'Szampony', 'Lakiery', 'Narzędzia', 'Środki czystości', 'Akcesoria', 'Inne']

export function MagazynClient({ salonId, initialItems, services }: Props) {
  const supabase = createClient()
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [historyItem, setHistoryItem] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'all' | 'alerts'>('all')

  const [form, setForm] = useState({
    name: '', category: '', description: '', quantity: '0',
    unit: 'szt', price_per_unit: '0', alert_threshold: '1',
    supplier: '', sku: '', service_usage: {} as Record<string, string>
  })

  const load = async () => {
    const { data } = await supabase.from('inventory').select('*').eq('salon_id', salonId).eq('is_active', true).order('name')
    setItems(data || [])
  }

  const lowStock = useMemo(() => items.filter(i => i.quantity <= i.alert_threshold), [items])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const base = tab === 'alerts' ? lowStock : items
    return base.filter(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q))
  }, [items, lowStock, search, tab])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', category: '', description: '', quantity: '0', unit: 'szt', price_per_unit: '0', alert_threshold: '1', supplier: '', sku: '', service_usage: {} })
    setShowModal(true)
  }

  const openEdit = (item: any) => {
    setEditing(item)
    setForm({
      name: item.name, category: item.category || '', description: item.description || '',
      quantity: String(item.quantity), unit: item.unit, price_per_unit: String(item.price_per_unit),
      alert_threshold: String(item.alert_threshold), supplier: item.supplier || '', sku: item.sku || '',
      service_usage: Object.fromEntries(Object.entries(item.service_usage || {}).map(([k, v]) => [k, String(v)]))
    })
    setShowModal(true)
  }

  const openHistory = async (item: any) => {
    setHistoryItem(item)
    const { data } = await supabase.from('inventory_history').select('*').eq('item_id', item.id).order('created_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }

  const save = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    const service_usage = Object.fromEntries(
      Object.entries(form.service_usage).filter(([, v]) => parseFloat(v) > 0).map(([k, v]) => [k, parseFloat(v)])
    )
    const payload = {
      salon_id: salonId, name: form.name, category: form.category || null, description: form.description || null,
      quantity: parseFloat(form.quantity), unit: form.unit, price_per_unit: parseFloat(form.price_per_unit),
      alert_threshold: parseFloat(form.alert_threshold), supplier: form.supplier || null, sku: form.sku || null,
      service_usage
    }

    if (editing) {
      await supabase.from('inventory').update(payload).eq('id', editing.id)
    } else {
      const { data } = await supabase.from('inventory').insert(payload).select().single()
      // Log initial stock
      if (data && parseFloat(form.quantity) > 0) {
        await supabase.from('inventory_history').insert({
          item_id: data.id, salon_id: salonId, change_type: 'add',
          quantity_before: 0, quantity_change: parseFloat(form.quantity), quantity_after: parseFloat(form.quantity)
        })
      }
    }

    await load()
    setShowModal(false)
    setLoading(false)
  }

  const adjustQuantity = async (item: any, delta: number, notes?: string) => {
    const newQty = Math.max(0, item.quantity + delta)
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', item.id)
    await supabase.from('inventory_history').insert({
      item_id: item.id, salon_id: salonId,
      change_type: delta > 0 ? 'add' : 'use',
      quantity_before: item.quantity, quantity_change: delta, quantity_after: newQty,
      notes
    })
    await load()
  }

  const CHANGE_LABELS: Record<string, string> = { add: '➕ Dodano', use: '➖ Użyto', sell: '💰 Sprzedano', adjust: '✏️ Korekta' }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Magazyn</h1>
          <p className="text-sm text-gray-500">{items.length} produktów · {lowStock.length > 0 && <span className="text-red-500 font-medium">{lowStock.length} na wyczerpaniu</span>}</p>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Dodaj produkt</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj produktu..." className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('all')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            Wszystkie ({items.length})
          </button>
          <button onClick={() => setTab('alerts')} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'alerts' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            {lowStock.length > 0 && <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block mr-1.5" />}
            Alerty ({lowStock.length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="w-16 h-16" />} title={tab === 'alerts' ? 'Brak alertów' : 'Brak produktów'} description={tab === 'alerts' ? 'Wszystkie produkty mają wystarczający stan' : 'Dodaj pierwszy produkt do magazynu'} action={tab === 'all' ? <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Dodaj produkt</Button> : undefined} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Produkt</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Stan</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Cena/szt.</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Alert</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = item.quantity <= item.alert_threshold
                return (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-sm font-semibold', isLow ? 'text-red-600' : 'text-gray-900')}>
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-sm text-gray-600">{item.price_per_unit} zł</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="text-xs text-gray-400">≤ {item.alert_threshold} {item.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => adjustQuantity(item, -1)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-bold">−</button>
                        <button onClick={() => adjustQuantity(item, 1)} className="w-7 h-7 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-bold">+</button>
                        <button onClick={() => openHistory(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><History className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj produkt' : 'Nowy produkt'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Button><Button onClick={save} loading={loading}>Zapisz</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nazwa produktu" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <Select label="Kategoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="— wybierz —" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Stan" type="number" step="0.001" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Select label="Jednostka" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} options={UNITS.map(u => ({ value: u, label: u }))} />
            <Input label="Próg alertu" type="number" step="0.001" value={form.alert_threshold} onChange={e => setForm(f => ({ ...f, alert_threshold: e.target.value }))} hint="Alarmuj poniżej" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cena za jednostkę (zł)" type="number" step="0.01" value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))} />
            <Input label="Dostawca" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
          </div>
          <Input label="SKU / kod produktu" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />

          {/* Service usage */}
          {services.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Zużycie na usługę</p>
              <p className="text-xs text-gray-500 mb-2">Ile {form.unit || 'jednostek'} produktu zużywa każda usługa?</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {services.map(svc => (
                  <div key={svc.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 flex-1 truncate">{svc.name}</span>
                    <Input
                      type="number"
                      step="0.001"
                      value={form.service_usage[svc.id] || '0'}
                      onChange={e => setForm(f => ({ ...f, service_usage: { ...f.service_usage, [svc.id]: e.target.value } }))}
                      className="w-24"
                    />
                    <span className="text-xs text-gray-400 flex-shrink-0">{form.unit || 'szt'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal open={!!historyItem} onClose={() => setHistoryItem(null)} title={`Historia: ${historyItem?.name}`} size="md">
        <div className="space-y-2">
          {history.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Brak historii</p>}
          {history.map(h => (
            <div key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 min-w-24">{formatDate(h.created_at, 'dd.MM HH:mm')}</span>
              <span className="text-sm flex-1">{CHANGE_LABELS[h.change_type] || h.change_type}</span>
              <span className={cn('text-sm font-medium', h.quantity_change > 0 ? 'text-green-600' : 'text-red-600')}>
                {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
              </span>
              <span className="text-xs text-gray-400">{h.quantity_after} {historyItem?.unit}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
