// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-primary">Lohono Stays</h1>
          <p className="text-sm text-[var(--outline)] mt-1">Management Ecosystem</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl p-8 shadow-[var(--shadow-glass)]">
          <h2 className="text-lg font-bold text-foreground mb-6">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--outline)] uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--outline)] focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all outline-none border-none"
                placeholder="you@lohono.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--outline)] uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--outline)] focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all outline-none border-none"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-gradient-to-br from-[var(--primary-container)] to-primary text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--outline)] mt-6">
          Lohono Command Center · FY27
        </p>
      </div>
    </div>
  )
}
