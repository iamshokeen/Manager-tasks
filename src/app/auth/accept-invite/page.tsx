'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteData {
  workspaceName: string
  email: string
  hasExistingAccount: boolean
  invitedBy?: string
}

type Status = 'loading' | 'invalid' | 'ready' | 'accepting' | 'accepted'

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--outline-variant)]/30 border-t-primary animate-spin" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Accept Invite Content (reads search params)
// ---------------------------------------------------------------------------

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<Status>('loading')
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  // ---- Fetch invite on mount ----

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    let cancelled = false

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`)

        if (!res.ok) {
          if (!cancelled) setStatus('invalid')
          return
        }

        const data: InviteData = await res.json()
        if (!cancelled) {
          setInvite(data)
          setStatus('ready')
        }
      } catch {
        if (!cancelled) setStatus('invalid')
      }
    }

    fetchInvite()
    return () => { cancelled = true }
  }, [token])

  // ---- Accept invite ----

  const handleAccept = useCallback(async () => {
    if (!invite) return
    setError('')

    // If new user, require name
    if (!invite.hasExistingAccount && !name.trim()) {
      setError('Please enter your full name to continue.')
      return
    }

    setStatus('accepting')
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...((!invite.hasExistingAccount && name.trim()) ? { name: name.trim() } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to accept invitation. Please try again.')
        setStatus('ready')
        return
      }

      router.push(data.redirect ?? '/')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('ready')
    }
  }, [invite, name, token, router])

  // ---- Render: Loading ----

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4">
            <span className="text-white text-xl font-bold tracking-tight">L</span>
          </div>
          <p className="text-sm text-[var(--outline)]">Validating your invitation…</p>
        </div>
        <Spinner />
      </div>
    )
  }

  // ---- Render: Invalid ----

  if (status === 'invalid' || !invite) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          Invalid Invitation
        </h1>
        <p className="text-sm text-[var(--outline)] leading-relaxed mb-6">
          This invitation link is invalid or has expired. Please ask your admin to
          send a new invitation.
        </p>

        <Link
          href="/auth/login"
          className="text-sm text-primary hover:underline underline-offset-2 font-medium"
        >
          ← Back to login
        </Link>
      </div>
    )
  }

  // ---- Render: Ready / Accepting ----

  const isAccepting = status === 'accepting'

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full">

      {/* Logo + Heading */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white text-xl font-bold tracking-tight">L</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            You&apos;ve been invited
          </h1>
          <p className="text-sm text-[var(--outline)] mt-1">
            Join{' '}
            <span className="font-medium text-foreground">{invite.workspaceName}</span>
            {invite.invitedBy && (
              <> — invited by <span className="font-medium text-foreground">{invite.invitedBy}</span></>
            )}
          </p>
        </div>
      </div>

      {/* Email badge */}
      <div className="bg-[var(--surface-container-low)] rounded-lg px-4 py-2.5 mb-6 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-[var(--outline)] shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
        <span className="text-sm font-medium text-foreground">{invite.email}</span>
      </div>

      {/* Existing account: sign-in prompt */}
      {invite.hasExistingAccount ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--outline)] text-center leading-relaxed">
            You already have an account with this email. Sign in to accept the
            invitation.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>
          )}

          <div className="flex flex-col gap-2">
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="w-full h-10">
                Sign in to accept
              </Button>
            </Link>

            <Button
              size="lg"
              className="w-full h-10"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting…' : 'Accept Invitation'}
            </Button>
          </div>
        </div>
      ) : (
        /* New user: name input + accept */
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isAccepting}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            size="lg"
            className="w-full h-10"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? 'Accepting…' : 'Accept Invitation'}
          </Button>
        </div>
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Page (Suspense boundary required for useSearchParams in RSC)
// ---------------------------------------------------------------------------

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4">
          <span className="text-white text-xl font-bold tracking-tight">L</span>
        </div>
        <p className="text-sm text-[var(--outline)]">Loading invitation…</p>
        <div className="flex items-center justify-center py-6">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--outline-variant)]/30 border-t-primary animate-spin" />
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
