import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KlienciClient } from '@/components/clients/KlienciClient'

export default async function KlienciPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: salon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('salon_id', salon.id)
    .order('name')

  return <KlienciClient salonId={salon.id} initialClients={clients || []} />
}
