'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// OTP Input Component (inline)
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
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setDigits(next)

    const lastFilled = Math.min(pasted.length, 5)
    focusAt(lastFilled)

    if (pasted.length === 6) onComplete(pasted)
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
// Form Data
// ---------------------------------------------------------------------------

type Role = 'Manager' | 'Senior IC' | 'Direct Report' | 'Exec Viewer'

interface FormData {
  name: string
  email: string
  role: Role | ''
  team: string
  message: string
}

const ROLE_OPTIONS: Role[] = ['Manager', 'Senior IC', 'Direct Report', 'Exec Viewer']

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Step = 'form' | 'otp'

export default function RequestAccessPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    team: '',
    message: '',
  })

  const updateField = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  // ---- Step 1: submit request ----

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) { setError('Please enter your full name.'); return }
    if (!formData.email.trim()) { setError('Please enter your work email.'); return }
    if (!formData.role) { setError('Please select your role.'); return }
    if (!formData.team.trim()) { setError('Please enter your team name.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          roleRequested: formData.role,
          teamName: formData.team.trim(),
          message: formData.message.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to submit request. Please try again.')
        return
      }

      setStep('otp')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [formData])

  // ---- Step 2: verify OTP ----

  const handleVerify = useCallback(async (otp: string) => {
    setError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Invalid or expired code. Please try again.')
        return
      }

      router.push('/auth/pending')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setVerifying(false)
    }
  }, [formData.email, router])

  const handleResend = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          roleRequested: formData.role,
          teamName: formData.team.trim(),
          message: formData.message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to resend code.')
      }
    } catch {
      setError('Network error while resending code.')
    }
  }, [formData])

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
            {step === 'form' ? 'Request Access' : 'Verify your email'}
          </h1>
          <p className="text-sm text-[var(--outline)] mt-1">
            {step === 'form'
              ? 'Fill in your details to request workspace access'
              : `We sent a 6-digit code to ${formData.email}`}
          </p>
        </div>
      </div>

      {/* ---- Step 1: Request Form ---- */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Priya Sharma"
              value={formData.name}
              onChange={updateField('name')}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Work Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="priya@lohono.com"
              value={formData.email}
              onChange={updateField('email')}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={formData.role}
              onChange={updateField('role')}
              disabled={loading}
              className="flex h-10 w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none border-none disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
            >
              <option value="" disabled>Select your role…</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Team Name */}
          <div className="space-y-1.5">
            <Label htmlFor="team">Team name</Label>
            <Input
              id="team"
              type="text"
              placeholder="e.g. Guest Experience"
              value={formData.team}
              onChange={updateField('team')}
              disabled={loading}
            />
          </div>

          {/* Message (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="message">
              Message{' '}
              <span className="text-[var(--outline)] font-normal">(optional)</span>
            </Label>
            <textarea
              id="message"
              rows={3}
              placeholder="Why do you need access?"
              value={formData.message}
              onChange={updateField('message')}
              disabled={loading}
              className="flex w-full rounded-lg bg-[var(--surface-container-low)] px-3 py-2 text-sm text-foreground placeholder:text-[var(--outline)] focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none border-none resize-none disabled:cursor-not-allowed disabled:opacity-50"
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
            {loading ? 'Submitting…' : 'Lock It In'}
          </Button>

          <p className="text-center text-sm text-[var(--outline)]">
            Already have access?{' '}
            <Link
              href="/auth/login"
              className="text-primary hover:underline underline-offset-2 font-medium"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}

      {/* ---- Step 2: OTP Verification ---- */}
      {step === 'otp' && (
        <div className="space-y-6">
          <OtpInput onComplete={handleVerify} disabled={verifying} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>
          )}

          {verifying && (
            <p className="text-sm text-[var(--outline)] text-center">Verifying…</p>
          )}

          <div className="flex flex-col items-center gap-3">
            <ResendButton onResend={handleResend} disabled={verifying} />

            <button
              type="button"
              onClick={() => { setStep('form'); setError('') }}
              className="text-sm text-[var(--outline)] hover:text-foreground transition-colors"
            >
              ← Back to form
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
