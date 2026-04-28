import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get salon info
  const { data: salon } = await supabase
    .from('salons')
    .select('name, plan, sms_balance, sms_used_this_month, onboarding_completed, onboarding_step')
    .eq('owner_id', user.id)
    .single()

  // If no salon, redirect to onboarding
  if (!salon) redirect('/onboarding')

  // If onboarding not completed, redirect
  if (!salon.onboarding_completed) redirect('/onboarding')

  const smsLimit = { trial: 30, solo: 200, grow: 400, pro: 600, max: 1000 }[salon.plan as string] || 30

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        salonName={salon.name}
        salonPlan={salon.plan}
        smsBalance={salon.sms_used_this_month}
        smsLimit={smsLimit}
      />
      <main className="lg:pl-60 transition-all duration-300">
        <div className="p-4 lg:p-6 pt-16 lg:pt-6 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
