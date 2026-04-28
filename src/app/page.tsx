import Link from 'next/link'
import { Star, Calendar, Users, Gift, Package, TrendingUp, Zap, CheckCircle, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: Calendar, title: 'Inteligentny kalendarz', desc: 'Wizyty, blokady, pracownicy — wszystko w jednym miejscu. Widok tygodnia, dnia i miesiąca.' },
  { icon: Users, title: 'Baza klientek', desc: 'Historia wizyt, statystyki, notatki. Znajdź każdą klientkę w 2 sekundy.' },
  { icon: Gift, title: 'Program poleceń', desc: 'Automatyczne kody polecające, nagrody, rabaty. Klientki przyprowadzają nowe klientki.' },
  { icon: Package, title: 'Magazyn', desc: 'Śledzenie stanu produktów, alerty niskiego stanu, automatyczne odliczanie przy usługach.' },
  { icon: TrendingUp, title: 'Statystyki i finanse', desc: 'Raporty przychodów, kosztów, retencji. Wiesz ile zarabiasz każdego dnia.' },
  { icon: Zap, title: 'Automatyczne SMS', desc: 'Przypomnienia, potwierdzenia, lista oczekujących. Mniej nieobecności, więcej czasu.' },
]

const PLANS = [
  { name: 'SOLO', price: 99, staff: 1, sms: 200, popular: false },
  { name: 'GROW', price: 129, staff: 2, sms: 400, popular: true },
  { name: 'PRO', price: 159, staff: 4, sms: 600, popular: false },
  { name: 'MAX', price: 229, staff: '∞', sms: 1000, popular: false },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Referly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">Zaloguj się</Link>
            <Link href="/auth/register" className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
              Zacznij za darmo →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-violet-100">
          🎁 14 dni za darmo · 30 SMS gratis · Bez karty kredytowej
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
          System dla salonu urody,<br />
          <span className="text-violet-600">który naprawdę działa</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          Kalendarz, klienci, program poleceń, magazyn i SMS-y w jednym miejscu. Zacznij w 2 minuty.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/auth/register" className="bg-violet-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2">
            Załóż konto za darmo <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/auth/login" className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
            Zaloguj się
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">Dołączyło już 200+ salonów w Polsce</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Wszystko czego potrzebujesz</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="p-2.5 bg-violet-50 rounded-xl w-fit mb-4">
                  <f.icon className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Prosty cennik</h2>
          <p className="text-gray-500 text-center mb-10">Bez umów, bez ukrytych opłat. Anuluj kiedy chcesz.</p>
          <div className="grid md:grid-cols-4 gap-4">
            {PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-5 border ${p.popular ? 'border-violet-300 bg-violet-50 relative' : 'border-gray-100 bg-white'}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                    ⭐ Najpopularniejszy
                  </div>
                )}
                <p className="font-bold text-gray-900 mb-1">{p.name}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                  <span className="text-sm text-gray-500">zł/mies.</span>
                </div>
                <ul className="space-y-2 mb-5">
                  <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{p.staff === '∞' ? 'Nielimitowani' : p.staff} {typeof p.staff === 'number' && p.staff === 1 ? 'pracownik' : 'pracowników'}</li>
                  <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{p.sms} SMS/mies.</li>
                  <li className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />Wszystkie funkcje</li>
                </ul>
                <Link href="/auth/register" className={`block text-center py-2.5 rounded-xl text-sm font-medium transition-colors ${p.popular ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  Zacznij za darmo
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6">Każdy plan zaczyna się od 14-dniowego okresu próbnego</p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-violet-600 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Zacznij zarządzać salonem lepiej</h2>
          <p className="text-violet-200 mb-6">14 dni za darmo, bez karty kredytowej. Konfiguracja zajmuje 2 minuty.</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 bg-white text-violet-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-violet-50 transition-colors">
            Załóż konto →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
            <span className="text-gray-600 font-medium">Referly.pl</span>
          </div>
          <div className="flex gap-5">
            <Link href="/regulamin" className="hover:text-gray-600">Regulamin</Link>
            <Link href="/prywatnosc" className="hover:text-gray-600">Prywatność</Link>
            <Link href="/kontakt" className="hover:text-gray-600">Kontakt</Link>
          </div>
          <p>© 2024 Referly. Wszelkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  )
}
