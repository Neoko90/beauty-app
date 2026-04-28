import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatystykiClient } from '@/components/stats/StatystykiClient'

export default async function StatystykiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [{ data: appointments }, { data: staff }] = await Promise.all([
    supabase.from('appointments').select('starts_at, price, discount, status, staff_id, client_id').eq('salon_id', salon.id).gte('starts_at', start).order('starts_at'),
    supabase.from('staff').select('id, name, color').eq('salon_id', salon.id).eq('is_active', true),
  ])

  return <StatystykiClient appointments={appointments || []} staff={staff || []} />
}
