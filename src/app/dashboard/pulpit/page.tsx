import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardPulpit } from '@/components/dashboard/DashboardPulpit'

export default async function PulpitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: salon } = await supabase.from('salons').select('*').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  const [
    { data: thisMonthAppts },
    { data: lastMonthAppts },
    { data: activeClientsData },
    { data: todayAppts },
    { data: referralStats },
    { data: pendingReferrals },
  ] = await Promise.all([
    supabase.from('appointments').select('price, discount, status').eq('salon_id', salon.id).gte('starts_at', startOfMonth).eq('status', 'done'),
    supabase.from('appointments').select('price, discount, status').eq('salon_id', salon.id).gte('starts_at', startOfLastMonth).lte('starts_at', endOfLastMonth).eq('status', 'done'),
    supabase.from('clients').select('id').eq('salon_id', salon.id).eq('is_active', true),
    supabase.from('appointments').select('*, client:clients(name, phone), service:services(name), staff:staff(name, color)').eq('salon_id', salon.id).gte('starts_at', startOfToday).lte('starts_at', endOfToday).order('starts_at'),
    supabase.from('referrals').select('id').eq('salon_id', salon.id).eq('status', 'used'),
    supabase.from('referrals').select('id').eq('salon_id', salon.id).eq('status', 'pending'),
  ])

  const thisRevenue = (thisMonthAppts || []).reduce((sum: number, a: any) => sum + (a.price - (a.discount || 0)), 0)
  const lastRevenue = (lastMonthAppts || []).reduce((sum: number, a: any) => sum + (a.price - (a.discount || 0)), 0)
  const revenueChange = lastRevenue > 0 ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100) : 0
  const thisVisits = (thisMonthAppts || []).length
  const activeClientsCount = (activeClientsData || []).length
  const retentionRate = activeClientsCount ? Math.min(100, Math.round((thisVisits / (activeClientsCount * 0.15)) * 100)) : 0
  const userName = user.user_metadata?.full_name?.split(' ')[0] || 'Właścicielu'

  const kpis = {
    revenue: thisRevenue,
    revenueChange,
    visits: thisVisits,
    activeClients: activeClientsCount,
    retentionRate,
    referrals: (referralStats || []).length,
    pendingReferrals: (pendingReferrals || []).length,
  }

  return <DashboardPulpit salon={salon} userName={userName} kpis={kpis} todayAppts={todayAppts || []} />
}
