'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Card, Badge, Toggle } from '@/components/ui/index'
import { Zap, MessageSquare, Clock, Users, Send, CheckCircle, XCircle, AlertCircle, Edit2, Plus } from 'lucide-react'

const SMS_VARS = ['{imie}', '{data}', '{godzina}', '{usluga}', '{link}', '{salon}']
const SMS_TYPE_LABELS: Record<string, string> = { reminder: 'Przypomnienie', confirmation: 'Potwierdzenie', cancellation: 'Anulowanie', waiting_list: 'Lista oczekujących', custom: 'Niestandardowy' }
const SMS_STATUS_COLORS: Record<string, string> = { sent: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700' }

interface Props { salon: any; templates: any[]; logs: any[]; waitingList: any[] }

export function AutomatyzacjeClient({ salon, templates: initialTemplates, logs, waitingList }: Props) {
  const supabase = createClient()
  const [templates, setTemplates] = useState(initialTemplates)
  const [tab, setTab] = useState<'templates' | 'logs' | 'waiting'>('templates')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [salonForm, setSalonForm] = useState({ smsplanet_api_key: salon.smsplanet_api_key || '', smsplanet_sender: salon.smsplanet_sender || 'Referly' })
  const [savingConfig, setSavingConfig] = useState(false)

  const [form, setForm] = useState({
    type: 'reminder', name: '', content: '', hours_before: '24', is_active: true
  })

  const loadTemplates = async () => {
    const { data } = await supabase.from('sms_templates').select('*').eq('salon_id', salon.id).order('type')
    setTemplates(data || [])
  }

  const openEdit = (t: any) => {
    setEditing(t)
    setForm({ type: t.type, name: t.name, content: t.content, hours_before: String(t.hours_before), is_active: t.is_active })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ type: 'reminder', name: '', content: 'Cześć {imie}! Przypominamy o wizycie jutro o {godzina} ({usluga}). Zmień lub odwołaj: {link}', hours_before: '24', is_active: true })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return
    setLoading(true)
    const payload = { salon_id: salon.id, type: form.type, name: form.name, content: form.content, hours_before: parseInt(form.hours_before), is_active: form.is_active }
    if (editing) {
      await supabase.from('sms_templates').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('sms_templates').insert(payload)
    }
    await loadTemplates()
    setShowModal(false)
    setLoading(false)
  }

  const toggleTemplate = async (id: string, active: boolean) => {
    await supabase.from('sms_templates').update({ is_active: active }).eq('id', id)
    await loadTemplates()
  }

  const saveConfig = async () => {
    setSavingConfig(true)
    await supabase.from('salons').update({ smsplanet_api_key: salonForm.smsplanet_api_key, smsplanet_sender: salonForm.smsplanet_sender }).eq('id', salon.id)
    setSavingConfig(false)
  }

  const smsUsed = salon.sms_used_this_month || 0
  const smsTotal = salon.sms_balance || 0

  const insertVar = (v: string) => {
    setForm(f => ({ ...f, content: f.content + v }))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automatyzacje</h1>
        <p className="text-sm text-gray-500 mt-0.5">SMS, przypomnienia, lista oczekujących</p>
      </div>

      {/* SMS balance */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 rounded-xl"><MessageSquare className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="font-semibold text-gray-900">Stan SMS</p>
              <p className="text-xs text-gray-500">Wysłano {smsUsed} · Pozostało {smsTotal - smsUsed}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-violet-700">{smsTotal - smsUsed}</p>
            <p className="text-xs text-gray-400">SMS do wykorzystania</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={cn('h-2 rounded-full', smsUsed / smsTotal > 0.8 ? 'bg-red-500' : 'bg-violet-500')} style={{ width: `${Math.min((smsUsed / smsTotal) * 100, 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input label="Klucz API SMSPlanet" type="password" value={salonForm.smsplanet_api_key} onChange={e => setSalonForm(f => ({ ...f, smsplanet_api_key: e.target.value }))} placeholder="Twój klucz API..." hint="Ustawienia → API w panelu SMSPlanet" />
          <div className="space-y-1">
            <Input label="Nadawca SMS" value={salonForm.smsplanet_sender} onChange={e => setSalonForm(f => ({ ...f, smsplanet_sender: e.target.value }))} placeholder="Referly" hint="Maks. 11 znaków" />
            <Button variant="secondary" size="sm" onClick={saveConfig} loading={savingConfig}>Zapisz konfigurację</Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-0.5">
        {(['templates', 'logs', 'waiting'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
            {t === 'templates' ? '📝 Szablony' : t === 'logs' ? '📨 Historia SMS' : `⏳ Lista oczekujących (${waitingList.length})`}
          </button>
        ))}
      </div>

      {/* Templates */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />} variant="secondary">Nowy szablon</Button>
          </div>
          {templates.map(t => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                    <Badge variant="purple">{SMS_TYPE_LABELS[t.type]}</Badge>
                    {t.type === 'reminder' && <Badge variant="info"><Clock className="w-3 h-3 inline mr-0.5" />{t.hours_before}h przed</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{t.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.content.length} znaków · ~{Math.ceil(t.content.length / 160)} SMS</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle checked={t.is_active} onChange={v => toggleTemplate(t.id, v)} />
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SMS Logs */}
      {tab === 'logs' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Historia wysłanych SMS</h2>
          {logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Brak wysłanych SMS</div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={cn('text-xs px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0', SMS_STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600')}>
                    {log.status}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{log.message}</p>
                    <p className="text-xs text-gray-400">{log.client?.name || log.phone} · {formatDateTime(log.sent_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Waiting list */}
      {tab === 'waiting' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Lista oczekujących</h2>
          {waitingList.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm"><Users className="w-10 h-10 mx-auto mb-2 opacity-20" />Brak osób na liście oczekujących</div>
          ) : (
            <div className="space-y-2">
              {waitingList.map(w => (
                <div key={w.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{w.client_name}</p>
                    <p className="text-xs text-gray-500">{w.client_phone} · {w.service?.name}</p>
                  </div>
                  {w.preferred_date && <p className="text-xs text-gray-400">Preferuje: {w.preferred_date}</p>}
                  <Button variant="secondary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>Powiadom</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Template Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj szablon SMS' : 'Nowy szablon SMS'}
        footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>Anuluj</Button><Button onClick={save} loading={loading}>Zapisz</Button></>}>
        <div className="space-y-4">
          <Select label="Typ" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={Object.entries(SMS_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <Input label="Nazwa szablonu" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Np. Przypomnienie 24h" required />
          {form.type === 'reminder' && (
            <Select label="Ile godzin przed wizytą" value={form.hours_before} onChange={e => setForm(f => ({ ...f, hours_before: e.target.value }))} options={[{ value: '1', label: '1 godz.' }, { value: '2', label: '2 godz.' }, { value: '12', label: '12 godz.' }, { value: '24', label: '24 godz.' }, { value: '48', label: '48 godz.' }]} />
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Treść SMS</label>
              <span className="text-xs text-gray-400">{form.content.length} / 160 znaków</span>
            </div>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Treść wiadomości..." />
            <div className="flex gap-2 flex-wrap mt-2">
              {SMS_VARS.map(v => (
                <button key={v} onClick={() => insertVar(v)} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full hover:bg-violet-100 border border-violet-100">
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Kliknij zmienną aby wstawić do treści</p>
          </div>
          <Toggle checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Szablon aktywny" />
        </div>
      </Modal>
    </div>
  )
}
