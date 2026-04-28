import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UstawieniaClient } from '@/components/settings/UstawieniaClient'

export default async function UstawieniaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('*').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const [{ data: staff }, { data: services }, { data: resources }] = await Promise.all([
    supabase.from('staff').select('*').eq('salon_id', salon.id).order('name'),
    supabase.from('services').select('*').eq('salon_id', salon.id).order('name'),
    supabase.from('resources').select('*').eq('salon_id', salon.id).order('name'),
  ])

  return <UstawieniaClient salon={salon} staff={staff || []} services={services || []} resources={resources || []} />
}
