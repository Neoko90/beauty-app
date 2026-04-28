import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MagazynClient } from '@/components/inventory/MagazynClient'

export default async function MagazynPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')
  const [{ data: items }, { data: services }] = await Promise.all([
    supabase.from('inventory').select('*').eq('salon_id', salon.id).eq('is_active', true).order('name'),
    supabase.from('services').select('id, name').eq('salon_id', salon.id).eq('is_active', true).order('name'),
  ])
  return <MagazynClient salonId={salon.id} initialItems={items || []} services={services || []} />
}
