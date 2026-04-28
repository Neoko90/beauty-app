import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, minutesToHHMM } from '@/lib/utils'
import { MapPin, Phone, Mail, Globe, Clock, Star, Instagram, Facebook } from 'lucide-react'

const DAY_NAMES_FULL: Record<string, string> = {
  '1': 'Poniedziałek', '2': 'Wtorek', '3': 'Środa',
  '4': 'Czwartek', '5': 'Piątek', '6': 'Sobota', '7': 'Niedziela',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: salon } = await supabase.from('salons').select('name, description').eq('slug', slug).single()
  if (!salon) return {}
  return { title: salon.name, description: salon.description }
}

export default async function SalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: salon } = await supabase.from('salons').select('*').eq('slug', slug).eq('is_active', true).single()
  if (!salon) notFound()

  const [{ data: services }, { data: reviews }, { data: staffList }] = await Promise.all([
    supabase.from('services').select('name, price, price_max, duration_minutes, description, category').eq('salon_id', salon.id).eq('is_active', true).eq('is_online_bookable', true).order('name'),
    supabase.from('reviews').select('client_name, rating, comment, created_at').eq('salon_id', salon.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('staff').select('id, name, photo_url, color').eq('salon_id', salon.id).eq('is_active', true).eq('can_be_booked_online', true).order('name'),
  ])

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const grouped = (services || []).reduce((acc: any, svc) => {
    const cat = svc.category || 'Inne usługi'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://referly.pl'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO z nagłówkiem / banerem ──────────────────── */}
      {salon.hero_image_url ? (
        <div className="relative h-56 md:h-72 overflow-hidden">
          <img
            src={salon.hero_image_url}
            alt={salon.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Logo nad headerem */}
          {salon.logo_url && (
            <div className="absolute bottom-4 left-4">
              <img src={salon.logo_url} alt={salon.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg" />
            </div>
          )}
        </div>
      ) : null}

      {/* ── INFO SALONU ───────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Logo (jeśli nie ma hero) */}
          {!salon.hero_image_url && salon.logo_url && (
            <img src={salon.logo_url} alt={salon.name}
              className="w-20 h-20 rounded-2xl object-cover mb-4 border border-gray-100" />
          )}

          <h1 className="text-3xl font-bold text-gray-900">{salon.name}</h1>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2">
            {salon.city && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                {salon.address ? `${salon.address}, ${salon.city}` : salon.city}
              </span>
            )}
            {salon.phone && (
              <a href={`tel:${salon.phone}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
                <Phone className="w-4 h-4" />{salon.phone}
              </a>
            )}
            {salon.email && (
              <a href={`mailto:${salon.email}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
                <Mail className="w-4 h-4" />{salon.email}
              </a>
            )}
            {salon.website && (
              <a href={salon.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
                <Globe className="w-4 h-4" />Strona WWW
              </a>
            )}
            {salon.instagram_url && (
              <a href={salon.instagram_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
                <Instagram className="w-4 h-4" />Instagram
              </a>
            )}
            {salon.facebook_url && (
              <a href={salon.facebook_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600">
                <Facebook className="w-4 h-4" />Facebook
              </a>
            )}
          </div>

          {salon.description && (
            <p className="mt-3 text-gray-600 leading-relaxed">{salon.description}</p>
          )}

          {avgRating && (
            <div className="flex items-center gap-1.5 mt-3">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${parseFloat(avgRating) >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm font-medium text-gray-700">{avgRating}</span>
              <span className="text-sm text-gray-500">({reviews?.length} opinii)</span>
            </div>
          )}

          {salon.booking_enabled && (
            <Link
              href={`${appUrl}/umow/${slug}`}
              className="mt-5 inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-violet-700 transition-colors"
            >
              Umów wizytę online →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── PRACOWNICY ────────────────────────────────────── */}
        {staffList && staffList.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nasz zespół</h2>
            <div className="flex gap-4 flex-wrap">
              {staffList.map((s: any) => (
                <div key={s.id} className="flex flex-col items-center gap-2 w-20">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.name}
                      className="w-16 h-16 rounded-full object-cover border-2"
                      style={{ borderColor: s.color }} />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs text-gray-700 text-center font-medium leading-tight">{s.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USŁUGI I CENNIK ───────────────────────────────── */}
        {Object.keys(grouped).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Usługi i cennik</h2>
            {Object.entries(grouped).map(([cat, svcs]: any) => (
              <div key={cat} className="mb-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</h3>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {svcs.map((svc: any, i: number) => (
                    <div key={i} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{svc.name}</p>
                        {svc.description && <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {svc.price_max
                            ? `${formatCurrency(svc.price)} – ${formatCurrency(svc.price_max)}`
                            : formatCurrency(svc.price)}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-end">
                          <Clock className="w-3 h-3" />{minutesToHHMM(svc.duration_minutes)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── GODZINY OTWARCIA ──────────────────────────────── */}
        {salon.opening_hours && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Godziny otwarcia</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {Object.entries(DAY_NAMES_FULL).map(([d, name]) => {
                const h = salon.opening_hours[d]
                if (!h) return null
                return (
                  <div key={d} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 w-36">{name}</span>
                    <span className={`text-sm ml-auto font-medium ${h.is_open ? 'text-gray-900' : 'text-gray-400'}`}>
                      {h.is_open ? `${h.open} – ${h.close}` : 'Zamknięte'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO / GALERIA ───────────────────────────── */}
        {salon.gallery_urls?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio</h2>
            <div className="grid grid-cols-3 gap-2">
              {salon.gallery_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                  <img src={url} alt={`${salon.name} - zdjęcie ${i + 1}`}
                    className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── OPINIE ────────────────────────────────────────── */}
        {reviews && reviews.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Opinie klientek</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${r.rating >= s ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{r.client_name}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ───────────────────────────────────────────── */}
        {salon.booking_enabled && (
          <div className="bg-violet-600 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold text-lg mb-2">Gotowa na wizytę?</p>
            <p className="text-violet-200 text-sm mb-4">Zarezerwuj online w kilka sekund</p>
            <Link href={`${appUrl}/umow/${slug}`}
              className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-2.5 rounded-xl font-medium hover:bg-violet-50 transition-colors">
              Umów wizytę →
            </Link>
          </div>
        )}

        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Zasilane przez{' '}
            <a href="https://referly.pl" className="text-violet-500 hover:underline font-medium">Referly.pl</a>
          </p>
        </div>
      </div>
    </div>
  )
}
