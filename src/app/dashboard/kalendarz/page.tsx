import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KalendarzClient } from '@/components/calendar/KalendarzClient'

export default async function KalendarzPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams

  const { data: salon } = await supabase.from('salons').select('id, name').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const [
    { data: staff },
    { data: services },
    { data: resources },
    { data: clients },
  ] = await Promise.all([
    supabase.from('staff').select('*').eq('salon_id', salon.id).eq('is_active', true).order('name'),
    supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('name'),
    supabase.from('resources').select('*').eq('salon_id', salon.id).eq('is_active', true).order('name'),
    supabase.from('clients')
      .select('id, name, phone, referral_code, active_discount, active_discount_type, no_show_count, salon_id, total_spent, visit_count, tags, is_active, created_at, updated_at')
      .eq('salon_id', salon.id)
      .eq('is_active', true)
      .order('name')
      .limit(500),
  ])

  return (
    <KalendarzClient
      salonId={salon.id}
      staff={(staff || []) as any}
      services={(services || []) as any}
      resources={(resources || []) as any}
      clients={(clients || []) as any}
      initialDate={params.date}
      initialView={(params.view as any) || 'week'}
    />
  )
}
