'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// OTP Input Component
// ---------------------------------------------------------------------------

interface OtpInputProps {
  onComplete: (otp: string) => void
  disabled?: boolean
}

function OtpInput({ onComplete, disabled }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null))

  const focusAt = (index: number) => {
    const el = refs.current[index]
    if (el) {
      el.focus()
      el.select()
    }
  }

  const handleChange = (index: number, value: string) => {
    // Accept only a single digit
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
    <div className="flex gap-2 justify-center">
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
          className="w-11 h-12 text-center text-lg font-semibold rounded-lg bg-[var(--surface-container-low)] text-foreground focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all outline-none border border-[var(--outline-variant)]/30 focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <p className="text-sm text-[var(--outline)] text-center">
        Resend code in{' '}
        <span className="font-medium text-foreground tabular-nums">{countdown}s</span>
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={resending || disabled}
      className="text-sm text-primary hover:underline underline-offset-2 disabled:opacity-50 disabled:no-underline transition-all"
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
    <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full">

      {/* Logo + Heading */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white text-xl font-bold tracking-tight">L</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Lohono Command Center
          </h1>
          {step === 'email' && (
            <p className="text-sm text-[var(--outline)] mt-1">Sign in to your workspace</p>
          )}
        </div>
      </div>

      {/* ---- Step 1: Email ---- */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@lohono.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full h-10"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send Login Code'}
          </Button>

          <p className="text-center text-sm text-[var(--outline)]">
            Don&apos;t have access?{' '}
            <Link
              href="/auth/request-access"
              className="text-primary hover:underline underline-offset-2 font-medium"
            >
              Request access
            </Link>
          </p>
        </form>
      )}

      {/* ---- Step 2: OTP ---- */}
      {step === 'otp' && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-semibold text-foreground">Enter your login code</h2>
            <p className="text-sm text-[var(--outline)]">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <OtpInput onComplete={handleVerify} disabled={verifying} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full h-10"
            disabled={verifying}
            onClick={() => {
              const inputs = document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]')
              const otp = Array.from(inputs).map(i => i.value).join('')
              if (otp.length === 6) handleVerify(otp)
            }}
          >
            {verifying ? 'Verifying…' : 'Verify Code'}
          </Button>

          <div className="flex flex-col items-center gap-3">
            <ResendButton onResend={handleResend} disabled={verifying} />

            <button
              type="button"
              onClick={() => { setStep('email'); setError('') }}
              className="text-sm text-[var(--outline)] hover:text-foreground transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
