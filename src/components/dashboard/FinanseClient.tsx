'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, EmptyState } from '@/components/ui/index'
import { TrendingUp, TrendingDown, Plus, DollarSign, Filter } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'

const INCOME_CATS = ['Usługi fryzjerskie', 'Usługi kosmetyczne', 'Sprzedaż produktów', 'Zadatki', 'Inne przychody']
const EXPENSE_CATS = ['Czynsz', 'Media', 'Produkty/Materiały', 'Wynagrodzenia', 'Marketing', 'Sprzęt', 'Szkolenia', 'Ubezpieczenie', 'Inne koszty']
const PAYMENT_OPTS = [{ value: 'cash', label: 'Gotówka' }, { value: 'blik', label: 'BLIK' }, { value: 'card', label: 'Karta' }, { value: 'transfer', label: 'Przelew' }]

interface Props { salonId: string; initialEntries: any[]; staff: any[] }

export function FinanseClient({ salonId, initialEntries, staff }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState(initialEntries)
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [loading, setLoading] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  const [form, setForm] = useState({
    type: 'income', category: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
    staff_id: '', payment_method: ''
  })

  const currentMonth = subMonths(new Date(), monthOffset)
  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

  const load = async () => {
    const { data } = await supabase.from('finance_entries').select('*').eq('salon_id', salonId).gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false })
    setEntries(data || [])
  }

  const filtered = useMemo(() => {
    if (filterType === 'all') return entries
    return entries.filter(e => e.type === filterType)
  }, [entries, filterType])

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const profit = totalIncome - totalExpense

  const openAdd = (t: 'income' | 'expense') => {
    setType(t)
    setForm({ type: t, category: '', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), staff_id: '', payment_method: '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.category || !form.amount) return
    setLoading(true)
    await supabase.from('finance_entries').insert({
      salon_id: salonId, type: form.type, category: form.category,
      amount: parseFloat(form.amount), description: form.description || null,
      date: form.date, staff_id: form.staff_id || null, payment_method: form.payment_method || null
    })
    await load()
    setShowModal(false)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finanse</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={() => { setMonthOffset(o => o + 1); setTimeout(load, 100) }} className="p-1 hover:bg-gray-100 rounded text-gray-500">‹</button>
            <span className="text-sm text-gray-600 capitalize">{format(currentMonth, 'LLLL yyyy', { locale: pl })}</span>
            <button onClick={() => { setMonthOffset(o => Math.max(0, o - 1)); setTimeout(load, 100) }} className="p-1 hover:bg-gray-100 rounded text-gray-500" disabled={monthOffset === 0}>›</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openAdd('expense')} icon={<TrendingDown className="w-4 h-4" />}>Dodaj koszt</Button>
          <Button onClick={() => openAdd('income')} icon={<TrendingUp className="w-4 h-4" />}>Dodaj przychód</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-gray-500">Przychody</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-xl"><TrendingDown className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
              <p className="text-xs text-gray-500">Koszty</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', profit >= 0 ? 'bg-violet-50' : 'bg-orange-50')}>
              <DollarSign className={cn('w-5 h-5', profit >= 0 ? 'text-violet-600' : 'text-orange-600')} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', profit >= 0 ? 'text-violet-700' : 'text-orange-600')}>{formatCurrency(profit)}</p>
              <p className="text-xs text-gray-500">Zysk netto</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter + List */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilterType(f)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', filterType === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {f === 'all' ? 'Wszystkie' : f === 'income' ? '💰 Przychody' : '📉 Koszty'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">Brak wpisów w tym miesiącu</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Kategoria / Opis</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Płatność</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{e.category}</p>
                    {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {e.payment_method && <span className="text-xs text-gray-500 capitalize">{e.payment_method}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('text-sm font-semibold', e.type === 'income' ? 'text-green-700' : 'text-red-600')}>
                      {e.type === 'income' ? '+' : '−'}{formatCurrency(e.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={type === 'income' ? 'Dodaj przychód' : 'Dodaj koszt'}
        footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Button><Button onClick={save} loading={loading}>Dodaj</Button></>}>
        <div className="space-y-4">
          <Select label="Kategoria" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="— wybierz kategorię —" options={(type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => ({ value: c, label: c }))} />
          <Input label="Kwota (zł)" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          <Input label="Data" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          <Select label="Sposób płatności" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="— opcjonalnie —" options={PAYMENT_OPTS} />
          {staff.length > 0 && type === 'income' && (
            <Select label="Pracownik" value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} placeholder="— opcjonalnie —" options={staff.map(s => ({ value: s.id, label: s.name }))} />
          )}
          <Input label="Opis" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcjonalna notatka..." />
        </div>
      </Modal>
    </div>
  )
}
