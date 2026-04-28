import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SalonyPartClient } from '@/components/settings/SalonyPartClient'

export default async function SalonyPartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id, slug').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')
  const { data: partners } = await supabase.from('partner_salons').select('*').eq('salon_id', salon.id).order('partner_name')
  return <SalonyPartClient salonId={salon.id} salonSlug={salon.slug} initialPartners={partners || []} />
}
