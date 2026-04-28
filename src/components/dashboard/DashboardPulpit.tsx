'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatTime, cn } from '@/lib/utils'
import { KpiCard, Card, Badge } from '@/components/ui/index'
import { DollarSign, Calendar, Users, TrendingUp, Gift, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, addMonths, subMonths } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Props {
  salon: any
  userName: string
  kpis: {
    revenue: number
    revenueChange: number
    visits: number
    activeClients: number
    retentionRate: number
    referrals: number
    pendingReferrals: number
  }
  todayAppts: any[]
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Potwierdzona', pending: 'Oczekuje', awaiting_deposit: 'Zadatek',
  done: 'Odbyta', cancelled: 'Anulowana', no_show: 'Nieobecność',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  awaiting_deposit: 'bg-blue-100 text-blue-700',
  done: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-red-200 text-red-800',
}

const daysOfWeek = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

export function DashboardPulpit({ salon, userName, kpis, todayAppts }: Props) {
  const [calMonth, setCalMonth] = useState(new Date())
  const today = new Date()

  // Calendar days
  const monthStart = startOfMonth(calMonth)
  const monthEnd = endOfMonth(calMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Offset for Mon start
  let startOffset = getDay(monthStart) - 1
  if (startOffset < 0) startOffset = 6

  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

  const trialDaysLeft = salon.plan === 'trial' && salon.trial_ends_at
    ? Math.ceil((new Date(salon.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dzień dobry, {userName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">
            {format(today, 'EEEE, d MMMM yyyy', { locale: pl })}
          </p>
        </div>
        <div className="flex gap-3">
          {trialDaysLeft !== null && trialDaysLeft > 0 && (
            <div className="bg-violet-50 text-violet-700 px-4 py-2 rounded-xl text-sm font-medium border border-violet-100">
              ⏳ Okres próbny: {trialDaysLeft} dni
            </div>
          )}
          <Link href="/dashboard/kalendarz" className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nowa wizyta
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Przychód (mies.)"
          value={formatCurrency(kpis.revenue)}
          change={kpis.revenueChange}
          icon={<DollarSign className="w-4 h-4 text-violet-600" />}
          iconBg="bg-violet-50"
        />
        <KpiCard
          title="Wizyty w tym mies."
          value={kpis.visits}
          change={8}
          icon={<Calendar className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="Aktywne klientki"
          value={kpis.activeClients}
          change={5}
          icon={<Users className="w-4 h-4 text-pink-600" />}
          iconBg="bg-pink-50"
        />
        <KpiCard
          title="Retencja"
          value={`${kpis.retentionRate}%`}
          change={-2}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Main content: Calendar + Today */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Mini Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Kalendarz wizyt</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-28 text-center capitalize">
                  {format(calMonth, 'LLLL yyyy', { locale: pl })}
                </span>
                <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px">
              {Array(startOffset).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const todayStr = format(today, 'yyyy-MM-dd')
                const isTodayDay = dayStr === todayStr
                const hasDot = false // Would need appointments data per day

                return (
                  <Link
                    key={dayStr}
                    href={`/dashboard/kalendarz?date=${dayStr}`}
                    className={cn(
                      'aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all hover:bg-violet-50',
                      isTodayDay ? 'bg-violet-600 text-white hover:bg-violet-700 font-bold' : 'text-gray-700'
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                  </Link>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Today's appointments + Referrals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Dzisiejsze wizyty</h2>
              <Link href="/dashboard/kalendarz" className="text-xs text-violet-600 hover:underline">
                Zobacz wszystkie
              </Link>
            </div>

            {todayAppts.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Brak wizyt na dziś</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.slice(0, 6).map(appt => (
                  <div key={appt.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-shrink-0 text-right min-w-12">
                      <p className="text-sm font-bold text-gray-900">{formatTime(appt.starts_at)}</p>
                      <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{ backgroundColor: appt.staff?.color || '#7C3AED' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{appt.client?.name || appt.client_name || 'Gość'}</p>
                      <p className="text-xs text-gray-500 truncate">{appt.service?.name}</p>
                      <p className="text-xs text-gray-400">{appt.client?.phone || appt.client_phone}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', STATUS_COLORS[appt.status])}>
                      {STATUS_LABELS[appt.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Referral quick stats */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Polecenia</h2>
              <Gift className="w-4 h-4 text-violet-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-violet-700">{kpis.referrals}</p>
                <p className="text-xs text-violet-500">Wykorzystanych</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-700">{kpis.pendingReferrals}</p>
                <p className="text-xs text-yellow-500">Oczekujących</p>
              </div>
            </div>
            <Link href="/dashboard/polecenia" className="mt-3 text-xs text-violet-600 hover:underline flex items-center gap-1">
              Zarządzaj programem poleceń →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
