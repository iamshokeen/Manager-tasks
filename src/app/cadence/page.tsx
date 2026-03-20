'use client'

import React, { useState } from 'react'
import { Loader2, Calendar, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'

import { useCadences } from '@/hooks/use-cadences'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

const CADENCE_TYPE_CONFIG = {
  weekly_standup: { label: 'Weekly Standup', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  dept_review: { label: 'Dept Review', className: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20' },
  monthly_review: { label: 'Monthly Review', className: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20' },
  quarterly_review: { label: 'Quarterly Review', className: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' },
} as const

type CadenceType = keyof typeof CADENCE_TYPE_CONFIG

function CadenceTypeBadge({ type }: { type: string }) {
  const config = CADENCE_TYPE_CONFIG[type as CadenceType] ?? CADENCE_TYPE_CONFIG.weekly_standup
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', config.className)}>
      {config.label}
    </span>
  )
}

interface Cadence {
  id: string
  name: string
  type: string
  isActive: boolean
  schedule?: string | null
  durationMinutes?: number | null
  audience?: string | null
  prepItems: string[]
}

interface CadenceCardProps {
  cadence: Cadence
}

function CadenceCard({ cadence }: CadenceCardProps) {
  const [generating, setGenerating] = useState(false)

  async function handlePrepNow() {
    setGenerating(true)
    try {
      const res = await fetch('/api/cadence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadenceId: cadence.id }),
      })
      if (!res.ok) throw new Error('Failed to generate tasks')
      const json = await res.json()
      const count = json.data?.count ?? json.count ?? 0
      toast.success(`${count} prep task${count !== 1 ? 's' : ''} generated`)
    } catch {
      toast.error('Failed to generate prep tasks')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Active dot */}
          <div className={cn(
            'mt-1.5 w-2 h-2 rounded-full shrink-0',
            cadence.isActive ? 'bg-[#10B981]' : 'bg-[#6B7280]'
          )} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {cadence.name}
              </h3>
              <CadenceTypeBadge type={cadence.type} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {cadence.schedule && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {cadence.schedule}
                </span>
              )}
              {cadence.durationMinutes && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {cadence.durationMinutes} min
                </span>
              )}
              {cadence.audience && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {cadence.audience}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handlePrepNow}
          disabled={generating}
          className="shrink-0"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            'Prep Now'
          )}
        </Button>
      </div>

      {/* Prep Items */}
      {cadence.prepItems && cadence.prepItems.length > 0 && (
        <div className="mt-4 ml-5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Prep Items:</p>
          <ul className="flex flex-col gap-1.5">
            {cadence.prepItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1 w-2 h-2 rounded-full border border-muted-foreground shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function CadencePage() {
  const { cadences, isLoading } = useCadences()

  return (
    <div className="flex flex-col">
      <PageHeader title="Cadence" />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">Loading cadences…</div>
        </div>
      ) : (cadences as Cadence[]).length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title="No cadences found"
          description="Cadences are pre-seeded. Contact your admin to set them up."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {(cadences as Cadence[]).map(cadence => (
            <CadenceCard key={cadence.id} cadence={cadence} />
          ))}
        </div>
      )}
    </div>
  )
}
