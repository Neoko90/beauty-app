import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PoleceniaClient } from '@/components/referrals/PoleceniaClient'

export default async function PoleceniaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')
  const [{ data: settings }, { data: referrals }, { data: clients }] = await Promise.all([
    supabase.from('referral_settings').select('*').eq('salon_id', salon.id).single(),
    supabase.from('referrals').select('*, referrer:clients!referrer_id(name, phone), referred:clients!referred_id(name, phone)').eq('salon_id', salon.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('clients').select('id, name, referral_code, total_spent').eq('salon_id', salon.id).order('name'),
  ])
  return <PoleceniaClient salonId={salon.id} settings={settings} referrals={referrals || []} clients={clients || []} />
}
