'use client'
//
// People-wise activity reports (2026-05-14 rewrite).
//
// Replaces the previous stored-weekly-report dashboard. Shows one row per
// visible user (per manager chain) with task creation / completion / activity
// counts for the chosen daily / weekly / monthly window.

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Download, Users as UsersIcon,
} from 'lucide-react'

type Period = 'daily' | 'weekly' | 'monthly'

interface ReportRow {
  userId: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  tasksCreated: number
  tasksCompleted: number
  tasksInProgress: number
  tasksOverdue: number
  comments: number
  projectsActive: number
  details?: {
    created: Array<{ id: string; title: string; status: string }>
    completed: Array<{ id: string; title: string }>
  }
}

interface ReportPayload {
  period: Period
  rangeStart: string
  rangeEnd: string
  rows: ReportRow[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data)

function shiftAnchor(anchor: Date, period: Period, direction: -1 | 1): Date {
  const d = new Date(anchor)
  if (period === 'daily') d.setDate(d.getDate() + direction)
  else if (period === 'weekly') d.setDate(d.getDate() + 7 * direction)
  else d.setMonth(d.getMonth() + direction)
  return d
}

function formatRangeLabel(period: Period, start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (period === 'daily') return start.toLocaleDateString('en-IN', opts)
  if (period === 'monthly') return start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', opts)}`
}

function ratioBar(value: number, total: number) {
  if (total === 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly')
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const expandQuery = expandedUserId ? '&expand=1' : ''
  const dateStr = anchor.toISOString().slice(0, 10)
  const url = `/api/reports?period=${period}&date=${dateStr}${expandQuery}`
  const { data, isLoading, mutate } = useSWR<ReportPayload>(url, fetcher)

  const totals = useMemo(() => {
    if (!data) return null
    return data.rows.reduce(
      (acc, r) => ({
        tasksCreated: acc.tasksCreated + r.tasksCreated,
        tasksCompleted: acc.tasksCompleted + r.tasksCompleted,
        tasksOverdue: acc.tasksOverdue + r.tasksOverdue,
        comments: acc.comments + r.comments,
      }),
      { tasksCreated: 0, tasksCompleted: 0, tasksOverdue: 0, comments: 0 }
    )
  }, [data])

  function exportCsv() {
    if (!data) return
    const header = [
      'Name',
      'Email',
      'Role',
      'Tasks Created',
      'Tasks Completed',
      'In Progress',
      'Overdue',
      'Comments',
      'Active Projects',
    ]
    const rows = data.rows.map((r) => [
      r.name,
      r.email,
      r.role,
      r.tasksCreated,
      r.tasksCompleted,
      r.tasksInProgress,
      r.tasksOverdue,
      r.comments,
      r.projectsActive,
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((v) => {
            const s = String(v ?? '')
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(','),
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `kairos-report-${period}-${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('CSV exported')
  }

  const rangeStart = data ? new Date(data.rangeStart) : null
  const rangeEnd = data ? new Date(data.rangeEnd) : null
  const rangeLabel = rangeStart && rangeEnd ? formatRangeLabel(period, rangeStart, rangeEnd) : '—'

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Reports"
        description="People-wise activity: tasks, comments, and projects"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5">
              Refresh
            </Button>
            <Button onClick={exportCsv} disabled={!data || data.rows.length === 0} size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        }
      />

      {/* Period tab strip + date stepper */}
      <div
        className="flex items-center gap-3 mb-5 flex-wrap px-4 py-3 rounded-xl"
        style={{ background: 'var(--surface-container)' }}
      >
        <div className="flex rounded-lg p-1" style={{ background: 'var(--surface-container-high)' }}>
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all"
              style={
                period === p
                  ? { background: 'var(--surface-container-lowest)', color: 'var(--primary)' }
                  : { color: 'var(--on-surface-variant)', background: 'transparent' }
              }
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'var(--surface-container-high)' }}>
          <button
            onClick={() => setAnchor((a) => shiftAnchor(a, period, -1))}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            <CalendarIcon className="h-3.5 w-3.5" style={{ color: 'var(--on-surface-variant)' }} />
            {rangeLabel}
          </div>
          <button
            onClick={() => setAnchor((a) => shiftAnchor(a, period, 1))}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--on-surface-variant)' }}
            title="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAnchor(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })}
        >
          Today
        </Button>

        {totals && (
          <div className="ml-auto flex items-center gap-4 text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
            <span>Created: <span style={{ color: 'var(--on-surface)' }}>{totals.tasksCreated}</span></span>
            <span>Done: <span style={{ color: 'var(--on-surface)' }}>{totals.tasksCompleted}</span></span>
            <span>Overdue: <span style={{ color: 'var(--error)' }}>{totals.tasksOverdue}</span></span>
            <span>Activity: <span style={{ color: 'var(--on-surface)' }}>{totals.comments}</span></span>
          </div>
        )}
      </div>

      {/* Rows */}
      {isLoading ? (
        <div className="text-sm py-12 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-8 w-8" />}
          title="No people in view"
          description="Either no one reports up to you, or no one has done anything in this window."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {/* Header row */}
          <div
            className="grid grid-cols-[1.6fr_repeat(6,1fr)_40px] gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
          >
            <span>Person</span>
            <span>Created</span>
            <span>Completed</span>
            <span>In Progress</span>
            <span>Overdue</span>
            <span>Activity</span>
            <span>Projects</span>
            <span />
          </div>

          {data.rows.map((row) => {
            const expanded = expandedUserId === row.userId
            return (
              <div
                key={row.userId}
                className="rounded-xl"
                style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
              >
                <button
                  onClick={() => setExpandedUserId(expanded ? null : row.userId)}
                  className="grid grid-cols-[1.6fr_repeat(6,1fr)_40px] gap-2 px-4 py-3 w-full items-center transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold" style={{ color: 'var(--on-surface)' }}>{row.name}</span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--on-surface-variant)' }}>
                      {row.role.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                  <Cell value={row.tasksCreated} />
                  <Cell value={row.tasksCompleted} positive />
                  <Cell value={row.tasksInProgress} />
                  <Cell value={row.tasksOverdue} negative={row.tasksOverdue > 0} />
                  <Cell value={row.comments} />
                  <Cell value={row.projectsActive} />
                  <span style={{ color: 'var(--on-surface-variant)' }}>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>

                {expanded && (
                  <ExpandPanel userId={row.userId} period={period} dateStr={dateStr} />
                )}

                {/* tiny throughput bar — completed vs created */}
                <div className="px-4 pb-3 pt-0">
                  <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--surface-container-high)' }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${ratioBar(row.tasksCompleted, Math.max(row.tasksCreated, row.tasksCompleted, 1))}%`,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Cell({ value, positive, negative }: { value: number; positive?: boolean; negative?: boolean }) {
  const tone = positive
    ? 'var(--primary)'
    : negative
    ? 'var(--error)'
    : 'var(--on-surface)'
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color: tone }}>
      {value}
    </span>
  )
}

function ExpandPanel({ userId, period, dateStr }: { userId: string; period: Period; dateStr: string }) {
  // Fetch the full payload with expand=1 so we can pluck this user's details.
  const { data } = useSWR<ReportPayload>(
    `/api/reports?period=${period}&date=${dateStr}&expand=1`,
    fetcher
  )
  const row = data?.rows.find((r) => r.userId === userId)
  if (!row || !row.details) {
    return <div className="px-4 pb-3 text-xs" style={{ color: 'var(--on-surface-variant)' }}>Loading…</div>
  }
  const { created, completed } = row.details
  return (
    <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-6" style={{ borderTop: '1px solid var(--border)' }}>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2 pt-3" style={{ color: 'var(--on-surface-variant)' }}>
          Created ({created.length})
        </h4>
        {created.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>None in window</p>
        ) : (
          <ul className="space-y-1">
            {created.map((t) => (
              <li key={t.id} className="text-xs flex items-center justify-between gap-2">
                <span style={{ color: 'var(--on-surface)' }}>{t.title}</span>
                <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--on-surface-variant)' }}>{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2 pt-3" style={{ color: 'var(--on-surface-variant)' }}>
          Completed ({completed.length})
        </h4>
        {completed.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>None in window</p>
        ) : (
          <ul className="space-y-1">
            {completed.map((t) => (
              <li key={t.id} className="text-xs" style={{ color: 'var(--on-surface)' }}>{t.title}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
