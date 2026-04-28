'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Star } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError('Nieprawidłowy email lub hasło')
      setLoading(false)
      return
    }
    
    router.push('/dashboard/pulpit')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">Referly</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Witaj z powrotem!</h1>
          <p className="text-sm text-gray-500 mb-6">Zaloguj się do swojego salonu</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="twoj@email.pl"
              required
            />
            <Input
              label="Hasło"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-xs text-violet-600 hover:underline">
                Nie pamiętam hasła
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Zaloguj się
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Nie masz konta?{' '}
            <Link href="/auth/register" className="text-violet-600 font-medium hover:underline">
              Zarejestruj salon
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2024 Referly.pl · Wszystkie prawa zastrzeżone
        </p>
      </div>
    </div>
  )
}
