// src/components/dashboard/kpi-locked-section.tsx
'use client'

import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'

type RequestStatus = 'none' | 'pending' | 'approved' | 'denied'

export function KpiLockedSection() {
  const [status, setStatus] = useState<RequestStatus>('none')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/kpi-access/request')
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.status) setStatus(data.status as RequestStatus)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleRequestAccess() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/kpi-access/request', { method: 'POST' })
      if (res.ok) setStatus('pending')
    } catch {
      // silent fail
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
        Revenue KPIs
      </h2>
      <div className="bg-card rounded-xl p-6 shadow-[var(--shadow-glass)] flex flex-col items-center justify-center gap-4 py-10">
        <div className="w-12 h-12 rounded-xl bg-[var(--surface-container-high)] border border-[rgba(201,169,110,0.1)] flex items-center justify-center">
          <Lock size={20} color="#c9a96e" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground mb-1">Revenue KPIs</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Revenue data is restricted. Request access from your admin.
          </p>
        </div>

        {!loading && (
          <div className="mt-1">
            {status === 'none' && (
              <button
                onClick={handleRequestAccess}
                disabled={submitting}
                className="px-4 py-1.5 bg-[#c9a96e] text-[#0c0c18] rounded-lg text-sm font-semibold hover:bg-[#d4b87a] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Requesting…' : 'Request Access'}
              </button>
            )}
            {status === 'pending' && (
              <p className="text-sm text-[#c9a96e]">
                Request pending — awaiting admin approval.
              </p>
            )}
            {status === 'denied' && (
              <p className="text-sm text-muted-foreground">
                Access was denied. Contact your manager.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
