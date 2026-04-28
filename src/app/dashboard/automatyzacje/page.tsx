import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AutomatyzacjeClient } from '@/components/dashboard/AutomatyzacjeClient'

export default async function AutomatyzacjePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: salon } = await supabase.from('salons').select('id, sms_balance, sms_used_this_month, smsplanet_api_key, smsplanet_sender').eq('owner_id', user.id).single()
  if (!salon) redirect('/onboarding')

  const [{ data: templates }, { data: logs }, { data: waiting }] = await Promise.all([
    supabase.from('sms_templates').select('*').eq('salon_id', salon.id).order('type'),
    supabase.from('sms_logs').select('*, client:clients(name)').eq('salon_id', salon.id).order('sent_at', { ascending: false }).limit(50),
    supabase.from('waiting_list').select('*, service:services(name)').eq('salon_id', salon.id).eq('status', 'waiting').order('created_at'),
  ])

  return <AutomatyzacjeClient salon={salon} templates={templates || []} logs={logs || []} waitingList={waiting || []} />
}
