'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, TrendingDown, X, ChevronDown, ChevronUp, Bell } from 'lucide-react'
import useSWR from 'swr'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { addDays, isPast } from 'date-fns'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
  assignee?: { name: string } | null
}

interface FollowUpItem {
  id: string
  title: string
  contactName: string
  status: string
  reminderAt: string | null
  snoozedUntil: string | null
  autoRemind: boolean
  lastActivityAt: string
}

interface BacklogAlertProps {
  tasks: Task[]
  className?: string
}

function daysSince(dateStr?: string | null) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function BacklogAlert({ tasks, className }: BacklogAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const { data: followUpsData } = useSWR<FollowUpItem[]>('/api/follow-ups',
    (url: string) => fetch(url).then(r => r.json()).then(r => {
      const flat: FollowUpItem[] = []
      for (const fu of (r.data ?? [])) {
        flat.push(fu)
        for (const child of (fu.children ?? [])) flat.push(child)
      }
      return flat
    }),
    { onError: () => {} }
  )

  if (dismissed) return null

  const now = new Date()

  const overdue = tasks.filter(
    t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
  )
  const staleTodo = tasks.filter(
    t => t.status === 'todo' && daysSince(t.createdAt) > 7
  )
  const stuck = tasks.filter(
    t => t.status === 'in_progress' && daysSince(t.updatedAt) > 14
  )
  const needsFollowUp = (followUpsData ?? []).filter(fu => {
    if (fu.status !== 'open') return false
    if (fu.snoozedUntil && !isPast(new Date(fu.snoozedUntil))) return false
    if (fu.reminderAt && isPast(new Date(fu.reminderAt))) return true
    if (fu.autoRemind && isPast(addDays(new Date(fu.lastActivityAt), 1))) return true
    return false
  })

  if (overdue.length === 0 && staleTodo.length === 0 && stuck.length === 0 && needsFollowUp.length === 0) return null

  const urgentCount = overdue.filter(t => t.priority === 'urgent' || t.priority === 'high').length

  return (
    <div className={cn(
      'rounded-xl border bg-card shadow-[var(--shadow-glass)] overflow-hidden',
      urgentCount > 0 ? 'border-destructive/30' : 'border-amber-300/50',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        urgentCount > 0 ? 'bg-destructive/5' : 'bg-amber-50/60 dark:bg-amber-900/10'
      )}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn(
            'h-4 w-4 shrink-0',
            urgentCount > 0 ? 'text-destructive' : 'text-amber-500'
          )} />
          <span className="text-sm font-semibold text-foreground">Backlog Alerts</span>
          <div className="flex items-center gap-1.5">
            {overdue.length > 0 && (
              <span className="text-xs font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                {overdue.length} overdue
              </span>
            )}
            {staleTodo.length > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                {staleTodo.length} stale
              </span>
            )}
            {stuck.length > 0 && (
              <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                {stuck.length} stuck
              </span>
            )}
            {needsFollowUp.length > 0 && (
              <span className="text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                {needsFollowUp.length} follow-up{needsFollowUp.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-3">
          {overdue.length > 0 && (
            <AlertGroup
              icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              label="Overdue"
              tasks={overdue.slice(0, 5)}
              showDue
            />
          )}
          {staleTodo.length > 0 && (
            <AlertGroup
              icon={<TrendingDown className="h-3.5 w-3.5 text-amber-500" />}
              label="Stale (todo > 7 days)"
              tasks={staleTodo.slice(0, 4)}
            />
          )}
          {stuck.length > 0 && (
            <AlertGroup
              icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
              label="Stuck in progress (> 14 days)"
              tasks={stuck.slice(0, 4)}
            />
          )}
          {needsFollowUp.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bell className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Follow-ups needing attention</span>
              </div>
              <div className="flex flex-col gap-1">
                {needsFollowUp.slice(0, 4).map(fu => (
                  <Link key={fu.id} href="/follow-ups"
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] transition-colors group">
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">{fu.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fu.contactName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AlertGroup({ icon, label, tasks, showDue }: {
  icon: React.ReactNode
  label: string
  tasks: Task[]
  showDue?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map(t => (
          <Link
            key={t.id}
            href={`/tasks/${t.id}`}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] transition-colors group"
          >
            <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">{t.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              {t.assignee && <span className="text-xs text-muted-foreground">{t.assignee.name}</span>}
              {showDue && t.dueDate && (
                <span className="text-xs text-destructive font-medium">
                  {new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
