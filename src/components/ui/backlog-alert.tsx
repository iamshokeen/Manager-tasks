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

  const headerBg = urgentCount > 0 ? 'rgba(159,64,61,0.06)' : 'rgba(134,84,0,0.06)'
  const borderColor = urgentCount > 0 ? 'rgba(159,64,61,0.25)' : 'rgba(134,84,0,0.25)'

  return (
    <div
      className={cn('rounded-xl overflow-hidden', className)}
      style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)', border: `1px solid ${borderColor}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: headerBg }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: urgentCount > 0 ? 'var(--error)' : 'var(--tertiary)' }}
          >
            warning
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Backlog Alerts</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {overdue.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}>
                {overdue.length} overdue
              </span>
            )}
            {staleTodo.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }}>
                {staleTodo.length} stale
              </span>
            )}
            {stuck.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>
                {stuck.length} stuck
              </span>
            )}
            {needsFollowUp.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(234,88,12,0.12)', color: '#7c2d12' }}>
                {needsFollowUp.length} follow-up{needsFollowUp.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded transition-colors cursor-pointer"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded transition-colors cursor-pointer"
            title="Dismiss"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
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
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map(t => (
          <Link
            key={t.id}
            href={`/tasks/${t.id}`}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer"
            style={{ background: 'var(--surface-container-low)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)'}
          >
            <span className="text-xs font-medium truncate" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              {t.assignee && <span className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{t.assignee.name}</span>}
              {showDue && t.dueDate && (
                <span className="text-xs font-bold" style={{ color: 'var(--error)' }}>
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
