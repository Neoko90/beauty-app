import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addMinutes } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { salon_id, service_id, staff_id, starts_at, client_name, client_phone, client_email, notes, referral_code } = body

  if (!salon_id || !service_id || !starts_at || !client_name || !client_phone) {
    return NextResponse.json({ error: 'Brakuje wymaganych pól' }, { status: 400 })
  }

  // Get service to calculate end time and price
  const { data: service } = await supabase.from('services').select('price, duration_minutes, name').eq('id', service_id).single()
  if (!service) return NextResponse.json({ error: 'Usługa nie istnieje' }, { status: 404 })

  // Get salon settings
  const { data: salon } = await supabase.from('salons').select('booking_enabled, booking_min_advance_hours').eq('id', salon_id).single()
  if (!salon?.booking_enabled) return NextResponse.json({ error: 'Rezerwacja online wyłączona' }, { status: 403 })

  // Check advance booking requirement
  const startsAt = new Date(starts_at)
  const minBookingTime = new Date(Date.now() + (salon.booking_min_advance_hours || 1) * 3600000)
  if (startsAt < minBookingTime) {
    return NextResponse.json({ error: 'Za późno na rezerwację tego terminu' }, { status: 400 })
  }

  const endsAt = addMinutes(startsAt, service.duration_minutes)

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('salon_id', salon_id)
    .eq('staff_id', staff_id)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', starts_at)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'Ten termin jest już zajęty' }, { status: 409 })
  }

  // Find or create client
  let clientId: string | null = null
  if (client_phone) {
    const { data: existingClient } = await supabase.from('clients').select('id').eq('salon_id', salon_id).eq('phone', client_phone).single()
    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient } = await supabase.from('clients').insert({
        salon_id, name: client_name, phone: client_phone, email: client_email || null
      }).select('id').single()
      clientId = newClient?.id || null
    }
  }

  // Create appointment
  const { data: appointment, error } = await supabase.from('appointments').insert({
    salon_id,
    client_id: clientId,
    service_id,
    staff_id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    price: service.price,
    original_price: service.price,
    discount: 0,
    status: 'pending',
    source: 'online',
    client_name: clientId ? null : client_name,
    client_phone: clientId ? null : client_phone,
    referral_code: referral_code || null,
    notes: notes || null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send confirmation SMS (fire and forget)
  try {
    await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salon_id,
        phone: client_phone,
        message: `Cześć ${client_name}! Twoja wizyta ${service.name} w dniu ${startsAt.toLocaleDateString('pl-PL')} o ${startsAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })} została zarejestrowana. Potwierdzimy ją wkrótce.`,
        appointment_id: appointment.id,
        type: 'confirmation',
      })
    })
  } catch {}

  return NextResponse.json({ success: true, appointment_id: appointment.id })
}
