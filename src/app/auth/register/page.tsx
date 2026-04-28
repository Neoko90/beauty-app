'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Star, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', password2: '', name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.password2) {
      setError('Hasła nie są identyczne')
      return
    }
    if (form.password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków')
      return
    }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (authError) {
      setError(authError.message === 'User already registered' ? 'Ten email jest już używany' : authError.message)
      setLoading(false)
      return
    }

    if (data.user && !data.session) {
      setSuccess(true)
      setLoading(false)
      return
    }

    // Auto-confirmed (development)
    if (data.session) {
      router.push('/onboarding')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sprawdź email!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Wysłaliśmy link aktywacyjny na <strong>{form.email}</strong>. Kliknij w link, aby aktywować konto.
            </p>
            <p className="text-xs text-gray-400">Nie dostałeś emaila? Sprawdź folder spam.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">Referly</span>
        </div>

        {/* Trial banner */}
        <div className="bg-violet-600 text-white rounded-2xl p-4 mb-5 text-center">
          <p className="font-semibold">🎁 14 dni za darmo + 30 SMS gratis</p>
          <p className="text-violet-200 text-sm mt-0.5">Nie wymagamy karty kredytowej</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Załóż konto salonu</h1>
          <p className="text-sm text-gray-500 mb-6">Zacznij zarządzać salonem w 2 minuty</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Twoje imię"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Karolina Nowak"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="twoj@email.pl"
              required
            />
            <Input
              label="Hasło"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 8 znaków"
              required
            />
            <Input
              label="Powtórz hasło"
              type="password"
              value={form.password2}
              onChange={e => setForm(f => ({ ...f, password2: e.target.value }))}
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Utwórz konto →
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Masz już konto?{' '}
            <Link href="/auth/login" className="text-violet-600 font-medium hover:underline">
              Zaloguj się
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            Rejestrując się akceptujesz{' '}
            <Link href="/regulamin" className="underline">regulamin</Link> i{' '}
            <Link href="/prywatnosc" className="underline">politykę prywatności</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
