'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card, Badge, EmptyState, Toggle } from '@/components/ui/index'
import { Gift, Users, TrendingUp, Plus, Trash2, Copy, CheckCircle } from 'lucide-react'

interface Props {
  salonId: string
  settings: any
  referrals: any[]
  clients: any[]
}

export function PoleceniaClient({ salonId, settings: initialSettings, referrals, clients }: Props) {
  const supabase = createClient()
  const [settings, setSettings] = useState(initialSettings || {
    is_active: true, reward_type: 'amount', reward_referrer: 20, reward_new: 20,
    commission_on_original_price: true, multi_rewards: []
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'settings' | 'list' | 'top'>('settings')
  const [copied, setCopied] = useState<string | null>(null)

  const saveSettings = async () => {
    setSaving(true)
    if (settings.id) {
      await supabase.from('referral_settings').update({
        is_active: settings.is_active,
        reward_type: settings.reward_type,
        reward_referrer: parseFloat(settings.reward_referrer),
        reward_new: parseFloat(settings.reward_new),
        commission_on_original_price: settings.commission_on_original_price,
        multi_rewards: settings.multi_rewards,
      }).eq('id', settings.id)
    } else {
      const { data } = await supabase.from('referral_settings').insert({
        salon_id: salonId, ...settings
      }).select().single()
      if (data) setSettings(data)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addMultiReward = () => {
    setSettings((s: any) => ({
      ...s,
      multi_rewards: [...(s.multi_rewards || []), { count: 3, reward: 50, description: '' }]
    }))
  }

  const removeMultiReward = (i: number) => {
    setSettings((s: any) => ({ ...s, multi_rewards: s.multi_rewards.filter((_: any, j: number) => j !== i) }))
  }

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://referly.pl/p/${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const usedReferrals = referrals.filter(r => r.status === 'used')
  const pendingReferrals = referrals.filter(r => r.status === 'pending')
  const totalRewards = usedReferrals.reduce((s: number, r: any) => s + (r.reward_referrer || 0), 0)

  // Top referrers
  const topReferrers = clients
    .map(c => ({
      ...c,
      referrals: referrals.filter(r => r.referrer_id === c.id).length,
      used: referrals.filter(r => r.referrer_id === c.id && r.status === 'used').length,
    }))
    .filter(c => c.referrals > 0)
    .sort((a, b) => b.used - a.used)
    .slice(0, 10)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Program poleceń</h1>
        <p className="text-sm text-gray-500 mt-0.5">Nagradzaj klientki za polecanie Twojego salonu</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 rounded-xl"><Gift className="w-5 h-5 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{usedReferrals.length}</p>
              <p className="text-xs text-gray-500">Wykorzystanych poleceń</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-50 rounded-xl"><Users className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingReferrals.length}</p>
              <p className="text-xs text-gray-500">Oczekujących</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRewards)}</p>
              <p className="text-xs text-gray-500">Wypłaconych nagród</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-0.5">
        {(['settings', 'list', 'top'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {t === 'settings' ? '⚙️ Ustawienia' : t === 'list' ? '📋 Lista poleceń' : '🏆 Ranking'}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === 'settings' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Konfiguracja programu</h2>
          <div className="space-y-5">
            <Toggle
              checked={settings.is_active}
              onChange={v => setSettings((s: any) => ({ ...s, is_active: v }))}
              label="Program poleceń aktywny"
            />

            <Select
              label="Typ nagrody"
              value={settings.reward_type}
              onChange={e => setSettings((s: any) => ({ ...s, reward_type: e.target.value }))}
              options={[{ value: 'amount', label: 'Kwota (zł)' }, { value: 'percent', label: 'Procent (%)' }]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Nagroda dla polecającej (${settings.reward_type === 'percent' ? '%' : 'zł'})`}
                type="number"
                value={settings.reward_referrer}
                onChange={e => setSettings((s: any) => ({ ...s, reward_referrer: e.target.value }))}
                hint="Klientka, która poleciła salon"
              />
              <Input
                label={`Nagroda dla nowej klientki (${settings.reward_type === 'percent' ? '%' : 'zł'})`}
                type="number"
                value={settings.reward_new}
                onChange={e => setSettings((s: any) => ({ ...s, reward_new: e.target.value }))}
                hint="Nowa klientka z polecenia"
              />
            </div>

            <Toggle
              checked={settings.commission_on_original_price}
              onChange={v => setSettings((s: any) => ({ ...s, commission_on_original_price: v }))}
              label="Naliczaj prowizję od ceny przed rabatem"
            />

            {/* Multi-rewards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nagrody wielokrotne</p>
                  <p className="text-xs text-gray-500">Dodatkowe nagrody za określoną liczbę poleceń</p>
                </div>
                <Button variant="secondary" size="sm" onClick={addMultiReward} icon={<Plus className="w-3.5 h-3.5" />}>
                  Dodaj próg
                </Button>
              </div>
              {(settings.multi_rewards || []).length === 0 && (
                <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                  Brak progów wielokrotnych — kliknij „Dodaj próg"
                </p>
              )}
              <div className="space-y-2">
                {(settings.multi_rewards || []).map((mr: any, i: number) => (
                  <div key={i} className="flex gap-3 items-center bg-gray-50 rounded-xl p-3">
                    <Input
                      type="number"
                      value={mr.count}
                      onChange={e => setSettings((s: any) => ({
                        ...s, multi_rewards: s.multi_rewards.map((x: any, j: number) => j === i ? { ...x, count: e.target.value } : x)
                      }))}
                      placeholder="3"
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500 flex-shrink-0">poleceń →</span>
                    <Input
                      type="number"
                      value={mr.reward}
                      onChange={e => setSettings((s: any) => ({
                        ...s, multi_rewards: s.multi_rewards.map((x: any, j: number) => j === i ? { ...x, reward: e.target.value } : x)
                      }))}
                      placeholder="50"
                      className="w-24"
                    />
                    <span className="text-sm text-gray-500 flex-shrink-0">{settings.reward_type === 'percent' ? '%' : 'zł'}</span>
                    <Input
                      value={mr.description}
                      onChange={e => setSettings((s: any) => ({
                        ...s, multi_rewards: s.multi_rewards.map((x: any, j: number) => j === i ? { ...x, description: e.target.value } : x)
                      }))}
                      placeholder="Opis nagrody (opcjonalnie)"
                      className="flex-1"
                    />
                    <button onClick={() => removeMultiReward(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveSettings} loading={saving} icon={saved ? <CheckCircle className="w-4 h-4" /> : undefined}>
              {saved ? 'Zapisano!' : 'Zapisz ustawienia'}
            </Button>
          </div>
        </Card>
      )}

      {/* List tab */}
      {tab === 'list' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Historia poleceń</h2>
          {referrals.length === 0 ? (
            <EmptyState icon={<Gift className="w-12 h-12" />} title="Brak poleceń" description="Gdy klientki zaczną polecać salon, pojawią się tutaj" />
          ) : (
            <div className="space-y-2">
              {referrals.map((r: any) => (
                <div key={r.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{r.referrer?.name || '—'}</p>
                      <span className="text-gray-400 text-xs">→</span>
                      <p className="text-sm text-gray-700">{r.referred?.name || 'Oczekuje'}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    {r.reward_referrer > 0 && <p className="text-sm font-medium text-green-700">+{formatCurrency(r.reward_referrer)}</p>}
                  </div>
                  <Badge variant={r.status === 'used' ? 'success' : r.status === 'pending' ? 'warning' : 'default'}>
                    {r.status === 'used' ? 'Użyte' : r.status === 'pending' ? 'Oczekuje' : 'Wygasłe'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Top tab */}
      {tab === 'top' && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Ranking poleceń</h2>
          {topReferrers.length === 0 ? (
            <EmptyState icon={<Users className="w-12 h-12" />} title="Brak danych" description="Ranking pojawi się gdy klientki zaczną polecać" />
          ) : (
            <div className="space-y-3">
              {topReferrers.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.referrals} poleceń · {c.used} zrealizowanych</p>
                  </div>
                  {c.referral_code && (
                    <button
                      onClick={() => copyLink(c.referral_code)}
                      className="flex items-center gap-1.5 text-xs text-violet-600 hover:bg-violet-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      {copied === c.referral_code ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === c.referral_code ? 'Skopiowano!' : `Kopiuj link`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
