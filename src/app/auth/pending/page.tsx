import Link from 'next/link'

const ADMIN_EMAIL = 'saksham.shokeen@lohono.com'

export default function PendingPage() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">

      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          {/* Clock icon */}
          <svg
            className="w-8 h-8 text-amber-500"
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
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-xl font-semibold text-foreground mb-2">
        Request Submitted
      </h1>

      {/* Body */}
      <p className="text-sm text-[var(--outline)] leading-relaxed mb-6">
        Your request is under review. You&apos;ll receive an email once your access is
        approved.
      </p>

      {/* Divider */}
      <div className="border-t border-[var(--outline-variant)]/20 mb-6" />

      {/* Contact */}
      <p className="text-sm text-[var(--outline)]">
        Questions? Reach out to{' '}
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
          href="/auth/login"
          className="text-sm text-[var(--outline)] hover:text-foreground transition-colors"
        >
          ← Back to login
        </Link>
      </div>

    </div>
  )
}
