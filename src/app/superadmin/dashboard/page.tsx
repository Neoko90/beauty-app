import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function SuperadminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.user_metadata?.is_superadmin) redirect('/dashboard/pulpit')

  const [{ data: salons, count: salonCount }, { data: recentSalons }] = await Promise.all([
    supabase.from('salons').select('id', { count: 'exact' }),
    supabase.from('salons').select('id, name, plan, created_at, trial_ends_at, city').order('created_at', { ascending: false }).limit(20),
  ])

  const planCounts = (recentSalons || []).reduce((acc: any, s: any) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1
    return acc
  }, {})

  const PLAN_LABELS: Record<string, string> = { trial: 'Trial', solo: 'Solo', grow: 'Grow', pro: 'Pro', max: 'Max' }
  const PLAN_COLORS: Record<string, string> = { trial: 'bg-gray-100 text-gray-700', solo: 'bg-green-100 text-green-800', grow: 'bg-yellow-100 text-yellow-800', pro: 'bg-red-100 text-red-800', max: 'bg-purple-100 text-purple-800' }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Superadmin Panel</h1>
            <p className="text-sm text-gray-500">Referly.pl — zarządzanie platformą</p>
          </div>
          <Link href="/dashboard/pulpit" className="text-sm text-violet-600 hover:underline">
            ← Powrót do pulpitu
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center col-span-1">
            <p className="text-3xl font-bold text-violet-700">{salonCount || 0}</p>
            <p className="text-xs text-gray-500">Salonów łącznie</p>
          </div>
          {Object.entries(PLAN_LABELS).map(([plan, label]) => (
            <div key={plan} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{planCounts[plan] || 0}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent salons */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Ostatnie salony</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Salon</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Miasto</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Rejestracja</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden lg:table-cell">Trial do</th>
              </tr>
            </thead>
            <tbody>
              {(recentSalons || []).map((s: any) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[s.plan]}`}>
                      {PLAN_LABELS[s.plan]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{s.city || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDate(s.created_at)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {s.trial_ends_at ? formatDate(s.trial_ends_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
