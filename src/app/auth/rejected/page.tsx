'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const ADMIN_EMAIL = 'saksham.shokeen@lohono.com'

function RejectedContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          {/* X circle icon */}
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

      {/* Heading */}
      <h1 className="text-xl font-semibold text-foreground mb-2">
        Access Not Approved
      </h1>

      {/* Body */}
      <p className="text-sm text-[var(--outline)] leading-relaxed mb-4">
        Your request to access Kairos was not approved.
      </p>

      {/* Rejection reason (if provided) */}
      {reason && (
        <div className="bg-red-50 rounded-lg px-4 py-3 mb-4 text-left">
          <p className="text-xs font-medium text-red-700 mb-1 uppercase tracking-wide">
            Reason
          </p>
          <p className="text-sm text-red-800 leading-relaxed">{reason}</p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[var(--outline-variant)]/20 mb-4" />

      {/* Contact */}
      <p className="text-sm text-[var(--outline)]">
        If you have questions, contact{' '}
        <a
          href={`mailto:${ADMIN_EMAIL}`}
          className="text-primary hover:underline underline-offset-2 font-medium"
        >
          {ADMIN_EMAIL}
        </a>
      </p>

      {/* Back link */}
      <div className="mt-6">
        <Link
          href="/"
          className="text-sm text-[var(--outline)] hover:text-foreground transition-colors"
        >
          ← Back to home
        </Link>
      </div>

    </div>
  )
}

export default function RejectedPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <p className="text-sm text-[var(--outline)]">Loading…</p>
      </div>
    }>
      <RejectedContent />
    </Suspense>
  )
}
