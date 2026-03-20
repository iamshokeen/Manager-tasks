// src/components/ui/agent-plan.tsx
'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, CircleAlert, CircleDotDashed, CircleX, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PlanItemStatus = 'completed' | 'in-progress' | 'pending' | 'need-help' | 'blocked'

export interface PlanItem {
  id: string
  title: string
  description?: string
  status: PlanItemStatus
  priority?: string
}

const STATUS_ICONS: Record<PlanItemStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--color-low)' }} />,
  'in-progress': <CircleDotDashed className="h-4 w-4 shrink-0 animate-spin" style={{ color: 'var(--color-medium)' }} />,
  pending: <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />,
  'need-help': <CircleAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--color-high)' }} />,
  blocked: <CircleX className="h-4 w-4 shrink-0" style={{ color: 'var(--color-critical)' }} />,
}

export function AgentPlan({ items, title }: { items: PlanItem[]; title?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      {title && (
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {title}
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-card/50">
          <button
            className="w-full flex items-center gap-3 p-3 text-left"
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            aria-expanded={expanded === item.id}
          >
            {STATUS_ICONS[item.status]}
            <span
              className={cn(
                'flex-1 text-sm',
                item.status === 'completed' && 'line-through text-muted-foreground'
              )}
            >
              {item.title}
            </span>
            {item.description && (
              <ChevronDown
                className={cn(
                  'h-3 w-3 text-muted-foreground transition-transform',
                  expanded === item.id && 'rotate-180'
                )}
              />
            )}
          </button>
          <AnimatePresence>
            {expanded === item.id && item.description && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-10 pb-3 text-xs text-muted-foreground">{item.description}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
