import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { salon_id, phone, message, appointment_id, client_id, type } = body

  if (!phone || !message || !salon_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get salon SMS config
  const { data: salon } = await supabase.from('salons').select('smsplanet_api_key, smsplanet_sender, sms_balance, sms_used_this_month').eq('id', salon_id).single()
  if (!salon) return NextResponse.json({ error: 'Salon not found' }, { status: 404 })

  // Check SMS balance
  const smsCount = Math.ceil(message.length / 160)
  if ((salon.sms_used_this_month || 0) + smsCount > (salon.sms_balance || 0)) {
    return NextResponse.json({ error: 'Insufficient SMS balance' }, { status: 402 })
  }

  let smsplanetMessageId: string | null = null
  let status = 'sent'
  let errorMessage = null

  // Send via SMSPlanet if API key configured
  if (salon.smsplanet_api_key) {
    try {
      const smsResponse = await fetch('https://api2.smsplanet.pl/sms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salon.smsplanet_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: salon.smsplanet_sender || 'Referly',
          to: [phone.replace(/\s/g, '').replace(/^\+48/, '')],
          msg: message,
        }),
      })

      const smsData = await smsResponse.json()
      if (smsData.status === 'OK') {
        smsplanetMessageId = smsData.id
        status = 'sent'
      } else {
        status = 'failed'
        errorMessage = smsData.message || 'SMS sending failed'
      }
    } catch (err) {
      status = 'failed'
      errorMessage = 'Network error'
    }
  } else {
    // No API key - simulate for testing
    status = 'sent'
    console.log(`[SMS MOCK] To: ${phone} | ${message}`)
  }

  // Log the SMS
  await supabase.from('sms_logs').insert({
    salon_id, appointment_id: appointment_id || null, client_id: client_id || null,
    type: type || 'custom', phone, message, status,
    smsplanet_message_id: smsplanetMessageId, error_message: errorMessage,
    sent_at: new Date().toISOString(),
  })

  // Update SMS counter if sent
  if (status === 'sent') {
    await supabase.from('salons').update({
      sms_used_this_month: (salon.sms_used_this_month || 0) + smsCount
    }).eq('id', salon_id)
  }

  return NextResponse.json({ success: status === 'sent', status, error: errorMessage })
}
