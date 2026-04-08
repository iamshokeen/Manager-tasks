'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KairosMark } from '@/components/ui/kairos-logo'

// ---------------------------------------------------------------------------
// OTP Input Component
// ---------------------------------------------------------------------------

interface OtpInputProps {
  onComplete: (otp: string) => void
  digits: string[]
  setDigits: (digits: string[]) => void
  disabled?: boolean
}

function OtpInput({ onComplete, digits, setDigits, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null))

  const focusAt = (index: number) => {
    const el = refs.current[index]
    if (el) {
      el.focus()
      el.select()
    }
  }

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < 5) {
      focusAt(index + 1)
    }

    if (next.every(d => d !== '')) {
      onComplete(next.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '') {
        if (index > 0) focusAt(index - 1)
      } else {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusAt(index - 1)
    } else if (e.key === 'ArrowRight' && index < 5) {
      focusAt(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const next = Array(6).fill('')
    pasted.split('').forEach((ch, i) => {
      next[i] = ch
    })
    setDigits(next)

    const lastFilled = Math.min(pasted.length, 5)
    focusAt(lastFilled)

    if (pasted.length === 6) {
      onComplete(pasted)
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            background: 'var(--surface-container-low)',
            color: 'var(--primary)',
          }}
          className="w-full h-16 text-center text-2xl font-bold rounded-xl border-none focus:ring-2 focus:ring-primary/30 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resend Button with countdown
// ---------------------------------------------------------------------------

interface ResendButtonProps {
  onResend: () => Promise<void>
  disabled?: boolean
}

function ResendButton({ onResend, disabled }: ResendButtonProps) {
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleResend = async () => {
    setResending(true)
    await onResend()
    setResending(false)
    setCountdown(60)
  }

  if (countdown > 0) {
    return (
      <p className="text-sm text-center" style={{ color: 'var(--on-surface-variant)' }}>
        Resend code in{' '}
        <span className="font-medium tabular-nums" style={{ color: 'var(--on-surface)' }}>{countdown}s</span>
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={resending || disabled}
      className="text-sm font-bold hover:underline underline-offset-2 disabled:opacity-50 disabled:no-underline transition-all"
      style={{ color: 'var(--primary)' }}
    >
      {resending ? 'Sending…' : 'Resend code'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Login Page
// ---------------------------------------------------------------------------

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  // ---- Step 1: send code ----

  const handleSendCode = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to send login code. Please try again.')
        return
      }

      setStep('otp')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [email])

  // ---- Step 2: verify OTP ----

  const handleVerify = useCallback(async (otp: string) => {
    setError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Invalid or expired code. Please try again.')
        return
      }

      router.push('/')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setVerifying(false)
    }
  }, [email, router])

  const handleResend = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to resend code.')
      }
    } catch {
      setError('Network error while resending code.')
    }
  }, [email])

  // ---- Render ----

  return (
    <>
      {/* Left panel — dark hero */}
      <aside
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col"
        style={{ background: 'var(--inverse-surface)' }}
      >
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Gradient tint */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,83,219,0.25) 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'var(--primary)' }}
            >
              <KairosMark size={24} className="text-white" />
            </div>
            <span
              className="font-headline font-extrabold text-2xl tracking-tight"
              style={{ color: '#ffffff' }}
            >
              Kairos
            </span>
          </div>

          {/* Tagline */}
          <div className="max-w-md">
            <h2
              className="font-headline font-bold text-4xl mb-4 leading-tight"
              style={{ color: '#ffffff' }}
            >
              Orchestrating the ledger of tomorrow.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)' }} className="text-lg">
              Precision architecture for enterprise-grade security and financial transparency.
            </p>
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <span>© 2024 Kairos AI</span>
            <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <span>v2.4.0-PRO</span>
          </div>
        </div>
      </aside>

      {/* Right panel — login form */}
      <main
        className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: 'var(--surface-container-lowest)' }}
      >
        <div className="w-full max-w-[400px] space-y-10">

          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
              style={{ background: 'var(--primary)' }}
            >
              <KairosMark size={28} className="text-white" />
            </div>
            <h1
              className="font-headline font-extrabold text-3xl tracking-tight"
              style={{ color: 'var(--on-surface)' }}
            >
              Kairos
            </h1>
          </div>

          {/* ---- Step 1: Email ---- */}
          {step === 'email' && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2
                  className="font-headline font-bold text-3xl tracking-tight"
                  style={{ color: 'var(--on-surface)' }}
                >
                  Welcome back
                </h2>
                <p style={{ color: 'var(--on-surface-variant)' }} className="text-base">
                  Enter your work email to receive a secure login code.
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    Work Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      disabled={loading}
                      className="w-full rounded-xl py-4 pl-4 pr-4 text-sm font-medium border-none focus:ring-2 transition-all duration-200 outline-none disabled:opacity-50"
                      style={{
                        background: 'var(--surface-container-low)',
                        color: 'var(--on-surface)',
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <p
                    className="text-sm rounded-lg px-3 py-2"
                    style={{ color: 'var(--error)', background: 'rgba(159,64,61,0.08)' }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-dim) 100%)',
                    color: '#f8f7ff',
                  }}
                >
                  {loading ? 'Sending…' : 'Send Login Code'}
                </button>

                <p className="text-center text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                  Don&apos;t have access?{' '}
                  <Link
                    href="/auth/request-access"
                    className="font-bold hover:underline underline-offset-2"
                    style={{ color: 'var(--primary)' }}
                  >
                    Request access
                  </Link>
                </p>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--surface-container-highest, #d9e4ea)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Enterprise Security
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--surface-container-highest, #d9e4ea)' }} />
              </div>
            </div>
          )}

          {/* ---- Step 2: OTP ---- */}
          {step === 'otp' && (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 -ml-1">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setError(''); setDigits(Array(6).fill('')) }}
                    className="p-2 rounded-full transition-colors"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    ←
                  </button>
                  <h2
                    className="font-headline font-bold text-3xl tracking-tight"
                    style={{ color: 'var(--on-surface)' }}
                  >
                    Verify Identity
                  </h2>
                </div>
                <p style={{ color: 'var(--on-surface-variant)' }} className="text-base">
                  We&apos;ve sent a 6-digit code to{' '}
                  <strong style={{ color: 'var(--on-surface)' }}>{email}</strong>
                </p>
              </div>

              <OtpInput onComplete={handleVerify} digits={digits} setDigits={setDigits} disabled={verifying} />

              {error && (
                <p
                  className="text-sm rounded-lg px-3 py-2 text-center"
                  style={{ color: 'var(--error)', background: 'rgba(159,64,61,0.08)' }}
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={verifying || digits.some(d => d === '')}
                onClick={() => {
                  const otp = digits.join('')
                  if (otp.length === 6) handleVerify(otp)
                }}
                className="w-full py-4 px-6 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-dim) 100%)',
                  color: '#f8f7ff',
                }}
              >
                {verifying ? 'Verifying…' : 'Verify and Login'}
              </button>

              <div className="flex flex-col items-center gap-3 text-center">
                <ResendButton onResend={handleResend} disabled={verifying} />
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setDigits(Array(6).fill('')) }}
                  className="text-sm transition-colors hover:underline underline-offset-2"
                  style={{ color: 'var(--on-surface-variant)' }}
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t pt-8"
            style={{ borderColor: 'var(--surface-container-highest, #d9e4ea)' }}
          >
            {['Privacy Policy', 'Terms of Service', 'Help Center'].map(link => (
              <a
                key={link}
                href="#"
                className="text-xs font-semibold transition-colors hover:underline"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {link}
              </a>
            ))}
          </footer>
        </div>
      </main>
    </>
  )
}
