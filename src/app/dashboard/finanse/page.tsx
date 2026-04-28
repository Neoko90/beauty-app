import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanseClient } from '@/components/dashboard/FinanseClient'

export default async function FinansePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: entries }, { data: staff }] = await Promise.all([
    supabase.from('finance_entries').select('*').eq('salon_id', salon.id).gte('date', startOfMonth.slice(0,10)).order('date', { ascending: false }),
    supabase.from('staff').select('id, name').eq('salon_id', salon.id).eq('is_active', true),
  ])

  return <FinanseClient salonId={salon.id} initialEntries={entries || []} staff={staff || []} />
}
