import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Star, Gift, Share2, MapPin, Phone, Clock } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('name, salon:salons(name)')
    .eq('referral_code', code)
    .single()
  if (!client) return {}
  return {
    title: `${client.name} poleca ${(client as any).salon?.name}`,
    description: `Umów wizytę przez link polecający i odbierz zniżkę!`,
  }
}

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  // Pobieramy klienta + dane salonu
  const { data: client } = await supabase
    .from('clients')
    .select(`
      id, name, referral_code, salon_id,
      salon:salons (
        id, name, slug, logo_url, city, address, phone,
        description, plan, opening_hours
      )
    `)
    .eq('referral_code', code)
    .single()

  if (!client) notFound()

  const salon = (client as any).salon
  if (!salon) notFound()

  // Ustawienia programu poleceń
  const { data: settings } = await supabase
    .from('referral_settings')
    .select('*')
    .eq('salon_id', client.salon_id)
    .single()

  // Usługi salonu (do podglądu)
  const { data: services } = await supabase
    .from('services')
    .select('name, price, duration_minutes, category')
    .eq('salon_id', client.salon_id)
    .eq('is_active', true)
    .eq('is_online_bookable', true)
    .order('name')
    .limit(6)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referly.pl'
  const bookingUrl = `${appUrl}/umow/${salon.slug}?ref=${code}`
  const shareMessage = `Hej! Umów się do ${salon.name} przez mój link i dostań zniżkę 🎁 ${bookingUrl}`

  const DAY_NAMES: Record<string, string> = {
    '1': 'Poniedziałek', '2': 'Wtorek', '3': 'Środa',
    '4': 'Czwartek', '5': 'Piątek', '6': 'Sobota', '7': 'Niedziela',
  }

  const hasDiscount = settings?.is_active && settings?.reward_new > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-4">

        {/* ── PROFIL KLIENTKI POLECAJĄCEJ ───────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Polecenie od</p>
              <p className="text-lg font-bold text-gray-900">{client.name}</p>
              <p className="text-sm text-gray-500">poleca salon urody</p>
            </div>
          </div>
        </div>

        {/* ── SALON — profil ────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Nagłówek salonu */}
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center gap-4">
              {salon.logo_url ? (
                <img src={salon.logo_url} alt={salon.name}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-gray-100" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                  <Star className="w-8 h-8 text-white fill-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{salon.name}</h1>
                {salon.city && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {salon.address ? `${salon.address}, ${salon.city}` : salon.city}
                  </p>
                )}
                {salon.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5" />
                    {salon.phone}
                  </p>
                )}
              </div>
            </div>
            {salon.description && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{salon.description}</p>
            )}
          </div>

          {/* Godziny otwarcia */}
          {salon.opening_hours && (
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Godziny otwarcia
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {Object.entries(DAY_NAMES).map(([d, name]) => {
                  const h = salon.opening_hours?.[d]
                  if (!h) return null
                  return (
                    <div key={d} className="flex items-center justify-between text-xs py-0.5">
                      <span className={h.is_open ? 'text-gray-700' : 'text-gray-400'}>{name.slice(0, 2)}.</span>
                      <span className={h.is_open ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {h.is_open ? `${h.open}–${h.close}` : 'Zamknięte'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Usługi */}
          {services && services.length > 0 && (
            <div className="px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Wybrane usługi</p>
              <div className="space-y-1.5">
                {services.map((svc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{svc.name}</span>
                    <span className="text-sm font-medium text-gray-900">{svc.price} zł</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── NAGRODA za polecenie ──────────────────────────── */}
        {hasDiscount && (
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-5 text-white text-center">
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <p className="text-sm opacity-80 mb-1">Zniżka na pierwszą wizytę</p>
            <p className="text-4xl font-bold mb-0.5">
              {settings.reward_new}
              {settings.reward_type === 'percent' ? '%' : ' zł'}
            </p>
            <p className="text-xs opacity-70">Tylko przez link {client.name}</p>
          </div>
        )}

        {/* ── CTA — umów wizytę ─────────────────────────────── */}
        <Link
          href={bookingUrl}
          className="block w-full text-center bg-violet-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
        >
          Umów wizytę {hasDiscount ? `ze zniżką ${settings.reward_new}${settings.reward_type === 'percent' ? '%' : ' zł'}` : 'online'} →
        </Link>

        {/* ── Udostępnij swój link ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-gray-400" />
            Podziel się z koleżankami
          </p>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs font-medium bg-green-50 text-green-700 py-3 rounded-xl hover:bg-green-100 transition-colors"
            >
              💬 WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 py-3 rounded-xl hover:bg-blue-100 transition-colors"
            >
              👍 Facebook
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl)
                  .then(() => alert('Link skopiowany!'))
                  .catch(() => {})
              }}
              className="flex items-center justify-center gap-1 text-xs font-medium bg-gray-50 text-gray-700 py-3 rounded-xl hover:bg-gray-100 transition-colors"
            >
              🔗 Kopiuj
            </button>
          </div>
        </div>

        {/* ── Link do strony salonu ─────────────────────────── */}
        <div className="text-center space-y-2">
          <Link
            href={`${appUrl}/salon/${salon.slug}`}
            className="text-sm text-violet-600 hover:underline font-medium"
          >
            Zobacz pełną stronę salonu →
          </Link>
          <p className="text-xs text-gray-400">
            Zasilane przez{' '}
            <a href="https://referly.pl" className="text-violet-500 hover:underline font-medium">
              Referly.pl
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
