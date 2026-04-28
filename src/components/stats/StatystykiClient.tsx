'use client'
import { useMemo, useState } from 'react'
import { format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/index'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'

interface Props { appointments: any[]; staff: any[] }

const PERIOD_OPTIONS = [
  { value: '7', label: '7 dni' }, { value: '30', label: '30 dni' },
  { value: '90', label: '3 miesiące' }, { value: '180', label: '6 miesięcy' },
]

const STATUS_COLORS: Record<string, string> = {
  done: '#7C3AED', cancelled: '#EF4444', no_show: '#F97316', confirmed: '#10B981', pending: '#F59E0B'
}

export function StatystykiClient({ appointments, staff }: Props) {
  const [period, setPeriod] = useState('90')
  const days = parseInt(period)

  const now = new Date()
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const filtered = useMemo(() =>
    appointments.filter(a => new Date(a.starts_at) >= periodStart),
    [appointments, period]
  )

  // Revenue by month (last 6 months)
  const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now })
  const revenueByMonth = months.map(m => {
    const monthAppts = appointments.filter(a => isSameMonth(new Date(a.starts_at), m) && a.status === 'done')
    return {
      name: format(m, 'MMM', { locale: pl }),
      przychod: Math.round(monthAppts.reduce((s, a) => s + (a.price - (a.discount || 0)), 0)),
      wizyty: monthAppts.length,
    }
  })

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filtered])

  // Staff performance
  const staffData = useMemo(() => {
    return staff.map(s => {
      const sAppts = filtered.filter(a => a.staff_id === s.id && a.status === 'done')
      return {
        name: s.name.split(' ')[0],
        przychod: Math.round(sAppts.reduce((sum, a) => sum + (a.price - (a.discount || 0)), 0)),
        wizyty: sAppts.length,
        color: s.color,
      }
    }).sort((a, b) => b.przychod - a.przychod)
  }, [filtered, staff])

  const totalRevenue = filtered.filter(a => a.status === 'done').reduce((s, a) => s + (a.price - (a.discount || 0)), 0)
  const totalDone = filtered.filter(a => a.status === 'done').length
  const totalCancelled = filtered.filter(a => a.status === 'cancelled' || a.status === 'no_show').length
  const uniqueClients = new Set(filtered.map(a => a.client_id).filter(Boolean)).size

  const STATUS_LABELS: Record<string, string> = { done: 'Odbyto', cancelled: 'Anulowano', no_show: 'Nieobecność', confirmed: 'Potwierdzone', pending: 'Oczekujące' }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-800 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-xs">
            {p.name === 'przychod' ? `Przychód: ${formatCurrency(p.value)}` : `Wizyty: ${p.value}`}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Statystyki</h1>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', period === p.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Łączny przychód', value: formatCurrency(totalRevenue), color: 'text-violet-700' },
          { label: 'Odbyto wizyt', value: totalDone, color: 'text-green-700' },
          { label: 'Anulowano / Nieobecności', value: totalCancelled, color: 'text-red-600' },
          { label: 'Unikalnych klientek', value: uniqueClients, color: 'text-blue-700' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-5">Przychód miesięczny (ostatnie 6 miesięcy)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="przychod" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visits chart */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-5">Wizyty miesięczne</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="wizyty" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Status pie */}
        <Card>
          <h2 className="font-semibold text-gray-900 mb-5">Statusy wizyt</h2>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Brak danych</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#D1D5DB'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, STATUS_LABELS[name as string] || name]} />
                <Legend formatter={name => STATUS_LABELS[name] || name} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Staff performance */}
      {staffData.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-5">Wydajność pracowników</h2>
          <div className="space-y-3">
            {staffData.map((s, i) => {
              const maxRevenue = staffData[0].przychod || 1
              const pct = Math.round((s.przychod / maxRevenue) * 100)
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-gray-700 truncate">{s.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                  <div className="text-right min-w-28">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(s.przychod)}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.wizyty} wizyt</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
