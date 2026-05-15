'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTasks } from '@/hooks/use-tasks'
import { useTeam } from '@/hooks/use-team'
import { useCadences } from '@/hooks/use-cadences'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Button } from '@/components/ui/button'
import { isOverdue, isDueToday, isDueSoon, formatDate } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { formatCrore } from '@/lib/format'
import { toast } from 'sonner'
import { TaskCalendarSection } from '@/components/dashboard/task-calendar-section'
import { BacklogAlert } from '@/components/ui/backlog-alert'
import { KpiLockedSection } from '@/components/dashboard/kpi-locked-section'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Member { id: string; name: string; role: string; department: string; status: string }

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const PRIORITY_STYLES: Record<string, { bg: string; color: string; label: string; dot: string }> = {
  critical: { bg: 'var(--error-container)',     color: 'var(--on-error-container)',     label: 'Urgent', dot: 'var(--error)' },
  high:     { bg: 'var(--tertiary-container)',  color: 'var(--on-tertiary-container)',  label: 'High',   dot: 'var(--tertiary)' },
  medium:   { bg: 'var(--primary-container)',   color: 'var(--on-primary-container)',   label: 'Med',    dot: 'var(--primary)' },
  low:      { bg: 'var(--surface-container)',   color: 'var(--on-surface-variant)',     label: 'Low',    dot: 'var(--outline)' },
}

// 2026-05-14: Revenue / OTA / GMV widgets hidden across the app. Toggle this
// flag back to `true` when revenue tracking is reactivated. Code paths below
// remain intact so the dashboard rebuilds cleanly when the flag flips.
const SHOW_REVENUE_KPIS = false

export default function DashboardPage() {
  const currentUser = useCurrentUser()
  const role = currentUser?.role ?? 'DIRECT_REPORT'
  const isOperator = ['SUPER_ADMIN', 'MANAGER'].includes(role)
  const canViewKpis = SHOW_REVENUE_KPIS && ['SUPER_ADMIN', 'MANAGER', 'EXEC_VIEWER'].includes(role)
  const { tasks, isLoading: tasksLoading } = useTasks()
  const myName = currentUser?.name ?? undefined
  const { tasks: assignedByMeTasks, isLoading: assignedByMeLoading } = useTasks(
    myName ? { assignedByName: myName } : {}
  )
  const { members, isLoading: teamLoading } = useTeam()
  const { data: metricsData, isLoading: numbersLoading } = useSWR('/api/metrics', fetcher)
  const { data: targetsData } = useSWR('/api/targets', fetcher)
  const { data: activityData } = useSWR('/api/activity', fetcher)
  const { cadences, isLoading: cadencesLoading } = useCadences()

  const [priorityTab, setPriorityTab] = useState<'all' | 'assigned_by_me'>('all')
  const [automationOpen, setAutomationOpen] = useState(false)
  const [syncingSheets, setSyncingSheets] = useState(false)
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [prepLoadingId, setPrepLoadingId] = useState<string | null>(null)

  const openTasks = tasks.filter((t: { status: string }) => t.status !== 'done')
  const overdueTasks = tasks.filter(
    (t: { status: string; dueDate: string | null }) => t.status !== 'done' && isOverdue(t.dueDate)
  )
  const dueTodayTasks = tasks.filter(
    (t: { status: string; dueDate: string | null }) => t.status !== 'done' && isDueToday(t.dueDate)
  )
  const dueThisWeekTasks = tasks.filter(
    (t: { status: string; dueDate: string | null }) => t.status !== 'done' && isDueSoon(t.dueDate, 168)
  )

  const metrics: Record<string, number> = metricsData?.data ?? {}
  const checkinValue = metrics['ci_revenue_ytd'] ?? null
  const otaValue = metrics['ota_gross_gmv_ytd'] ?? null
  const CHECKIN_TARGET: number = targetsData?.targets?.checkin?.ytd?.total ?? 851_910_648
  const OTA_TARGET: number = targetsData?.targets?.ota?.ytd?.revenue ?? 34_319_608

  const assignedByMeOpen = (assignedByMeTasks as Array<{ status: string; dueDate: string | null; priority: string; assigneeId?: string | null }>)
    .filter(t => t.status !== 'done')

  const activePriorityPool = priorityTab === 'assigned_by_me' ? assignedByMeOpen : openTasks
  const activeLoading = priorityTab === 'assigned_by_me' ? assignedByMeLoading : tasksLoading

  const priorityTasks = [...activePriorityPool]
    .sort((a: { priority: string; dueDate?: string | null }, b: { priority: string; dueDate?: string | null }) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority] ?? 99
      if (pa !== pb) return pa - pb
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
    .slice(0, 6)

  const memberTaskCount: Record<string, number> = {}
  for (const t of openTasks as Array<{ assigneeId?: string | null }>) {
    if (t.assigneeId) memberTaskCount[t.assigneeId] = (memberTaskCount[t.assigneeId] ?? 0) + 1
  }

  const activeCadences = (cadences as Array<{ id: string; name: string; day: string; time: string; scope: string; isActive: boolean }>)
    .filter((c) => c.isActive)

  async function handleSyncSheets() {
    setSyncingSheets(true)
    try {
      const res = await fetch('/api/numbers/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      toast.success('Sheets synced successfully')
    } catch { toast.error('Sheets sync failed') }
    finally { setSyncingSheets(false) }
  }

  async function handleGenerateAllPrep() {
    setGeneratingPrep(true)
    try {
      for (const cadence of activeCadences) {
        await fetch('/api/cadence/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cadenceId: cadence.id }) })
      }
      toast.success('Prep tasks generated for all cadences')
    } catch { toast.error('Failed to generate prep tasks') }
    finally { setGeneratingPrep(false) }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      const createRes = await fetch('/api/reports', { method: 'POST' })
      if (!createRes.ok) throw new Error('Failed to create report')
      const { data } = await createRes.json()
      if (!data?.id) throw new Error('No report id returned')
      const emailRes = await fetch(`/api/reports/${data.id}/email`, { method: 'POST' })
      if (!emailRes.ok) throw new Error('Failed to email report')
      toast.success('Weekly report generated and emailed')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to generate report') }
    finally { setGeneratingReport(false) }
  }

  async function handlePrepNow(cadenceId: string) {
    setPrepLoadingId(cadenceId)
    try {
      const res = await fetch('/api/cadence/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cadenceId }) })
      if (!res.ok) throw new Error('Failed')
      toast.success('Prep tasks generated')
    } catch { toast.error('Failed to generate prep tasks') }
    finally { setPrepLoadingId(null) }
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight" style={{ color: 'var(--on-surface)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Welcome back. Here&apos;s what&apos;s open.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
            {role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── 1. Stat Row (col-12) ── */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Open Tasks */}
          <div
            className="p-5 rounded-xl transition-colors cursor-default"
            style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>
              Open Tasks
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-extrabold" style={{ color: 'var(--on-surface)' }}>
                {tasksLoading ? '—' : openTasks.length}
              </span>
            </div>
          </div>

          {/* Overdue */}
          <div
            className="p-5 rounded-xl border-l-4 transition-colors cursor-default"
            style={{
              background: 'var(--surface-container-lowest)',
              boxShadow: 'var(--shadow-card)',
              borderLeftColor: 'var(--error)',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--error)' }}>
              Overdue
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-extrabold" style={{ color: 'var(--error)' }}>
                {tasksLoading ? '—' : overdueTasks.length}
              </span>
              {!tasksLoading && overdueTasks.length > 0 && (
                <span className="material-symbols-outlined text-lg" style={{ color: 'var(--error)', fontSize: '20px' }}>warning</span>
              )}
            </div>
          </div>

          {/* Due Today */}
          <div
            className="p-5 rounded-xl transition-colors cursor-default"
            style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>
              Due Today
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-extrabold" style={{ color: 'var(--primary)' }}>
                {tasksLoading ? '—' : dueTodayTasks.length}
              </span>
            </div>
          </div>

          {/* Due This Week */}
          <div
            className="p-5 rounded-xl transition-colors cursor-default"
            style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--on-surface-variant)' }}>
              Due This Week
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-3xl font-extrabold" style={{ color: 'var(--on-surface)' }}>
                {tasksLoading ? '—' : dueThisWeekTasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Revenue KPIs (col-4) — hidden via SHOW_REVENUE_KPIS flag. ── */}
        {SHOW_REVENUE_KPIS && canViewKpis ? (
          <div
            className="col-span-12 lg:col-span-4 p-6 rounded-xl space-y-5"
            style={{ background: 'var(--surface-container)' }}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface)' }}>
                Revenue KPIs
              </h3>
              <button
                onClick={handleSyncSheets}
                disabled={syncingSheets}
                className="flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface-variant)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {syncingSheets ? 'sync' : 'sync'}
                </span>
                {syncingSheets ? 'Syncing…' : 'Sync Sheets'}
              </button>
            </div>

            {numbersLoading ? (
              <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading revenue data…</div>
            ) : (
              <div className="space-y-5">
                {/* Check-in GMV */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span style={{ color: 'var(--on-surface-variant)' }}>Check-in GMV YTD</span>
                    <span style={{ color: 'var(--primary)' }}>
                      {checkinValue !== null ? `${((checkinValue / CHECKIN_TARGET) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--surface-container-highest)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        background: 'var(--primary)',
                        width: checkinValue !== null ? `${Math.min(100, (checkinValue / CHECKIN_TARGET) * 100).toFixed(1)}%` : '0%',
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1 text-right tracking-tight" style={{ color: 'var(--on-surface-variant)' }}>
                    {checkinValue !== null ? formatCrore(checkinValue) : '—'} / {formatCrore(CHECKIN_TARGET)}
                  </p>
                </div>
                {/* OTA GMV */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span style={{ color: 'var(--on-surface-variant)' }}>OTA Gross GMV YTD</span>
                    <span style={{ color: 'var(--tertiary)' }}>
                      {otaValue !== null ? `${((otaValue / OTA_TARGET) * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--surface-container-highest)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        background: 'var(--tertiary)',
                        width: otaValue !== null ? `${Math.min(100, (otaValue / OTA_TARGET) * 100).toFixed(1)}%` : '0%',
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-1 text-right tracking-tight" style={{ color: 'var(--on-surface-variant)' }}>
                    {otaValue !== null ? formatCrore(otaValue) : '—'} / {formatCrore(OTA_TARGET)}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : SHOW_REVENUE_KPIS ? (
          <div className="col-span-12 lg:col-span-4">
            <KpiLockedSection />
          </div>
        ) : null}

        {/* ── 3. Priority Tasks (col-8 → col-12 when revenue hidden) ── */}
        <div
          className={SHOW_REVENUE_KPIS ? 'col-span-12 lg:col-span-8 p-6 rounded-xl' : 'col-span-12 p-6 rounded-xl'}
          style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface)' }}>
              Priority Tasks
            </h3>
            <div className="flex items-center gap-3">
              <div
                className="flex rounded-lg p-1"
                style={{ background: 'var(--surface-container)' }}
              >
                <button
                  onClick={() => setPriorityTab('all')}
                  className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer"
                  style={priorityTab === 'all' ? {
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--primary)',
                    boxShadow: 'var(--shadow-card)',
                  } : { color: 'var(--on-surface-variant)' }}
                >
                  All
                </button>
                <button
                  onClick={() => setPriorityTab('assigned_by_me')}
                  className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer"
                  style={priorityTab === 'assigned_by_me' ? {
                    background: 'var(--surface-container-lowest)',
                    color: 'var(--primary)',
                    boxShadow: 'var(--shadow-card)',
                  } : { color: 'var(--on-surface-variant)' }}
                >
                  Assigned by me
                </button>
              </div>
              <Link href="/tasks" className="text-xs font-bold transition-colors" style={{ color: 'var(--primary)' }}>
                View all
              </Link>
            </div>
          </div>

          {activeLoading ? (
            <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading tasks…</div>
          ) : priorityTasks.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No open tasks. Nice work!</div>
          ) : (
            <div className="space-y-1">
              {priorityTasks.map((task: {
                id: string; title: string; priority: string; dueDate?: string | null;
                assignee?: { id: string; name: string } | null
              }) => {
                const ps = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer group"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ps.dot }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--on-surface)' }}>
                          {task.title}
                        </p>
                        {task.dueDate && (
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                            Due {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded uppercase"
                        style={{ background: ps.bg, color: ps.color }}
                      >
                        {ps.label}
                      </span>
                      {task.assignee && (
                        <MemberAvatar name={task.assignee.name} size="sm" />
                      )}
                      {task.dueDate && (
                        <span className="text-xs font-bold w-14 text-right hidden sm:block" style={{ color: 'var(--on-surface-variant)' }}>
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Backlog Alert (col-12) ── */}
        <div className="col-span-12">
          <BacklogAlert tasks={tasks} />
        </div>

        {/* ── 3b. Task Calendar (col-12) ── */}
        <div className="col-span-12">
          <TaskCalendarSection tasks={tasks} members={members as Member[]} />
        </div>

        {/* ── 4. Team Snapshot (col-4) ── */}
        {isOperator && (
          <div
            className="col-span-12 lg:col-span-4 p-6 rounded-xl"
            style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface)' }}>
                Team Load
              </h3>
              <Link href="/team" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                View all
              </Link>
            </div>
            {teamLoading ? (
              <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading team…</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(members as Member[]).filter(m => m.status === 'active').slice(0, 6).map((member) => (
                  <Link
                    key={member.id}
                    href={`/team/${member.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer"
                    style={{ background: 'var(--surface-container-low)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)'}
                  >
                    <MemberAvatar name={member.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                        {member.name.split(' ')[0]} {member.name.split(' ')[1]?.[0]}.
                      </p>
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: (memberTaskCount[member.id] ?? 0) > 7 ? 'var(--error)' : 'var(--on-surface-variant)' }}
                      >
                        {memberTaskCount[member.id] ?? 0} tasks
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 5. Active Cadences (col-8) ── */}
        <div className={`col-span-12 ${isOperator ? 'lg:col-span-8' : ''}`}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-headline font-bold text-lg" style={{ color: 'var(--on-surface)' }}>
              This Week&apos;s Rounds
            </h3>
            <Link href="/cadence" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              Manage
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cadencesLoading ? (
              <div className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>Loading cadences…</div>
            ) : activeCadences.length === 0 ? (
              <div className="col-span-full text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                No active cadences configured.
              </div>
            ) : activeCadences.map((cadence) => (
              <div
                key={cadence.id}
                className="p-5 rounded-xl flex flex-col justify-between"
                style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: 'var(--primary-container)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>
                        groups
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                      style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
                    >
                      {cadence.time}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--on-surface)' }}>
                    {cadence.name}
                  </h4>
                  <p className="text-xs mb-4" style={{ color: 'var(--on-surface-variant)' }}>
                    {cadence.day} · {cadence.scope}
                  </p>
                </div>
                <button
                  onClick={() => handlePrepNow(cadence.id)}
                  disabled={prepLoadingId === cadence.id}
                  className="w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'rgba(0,83,219,0.06)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(0,83,219,0.2)',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--primary)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--on-primary)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,83,219,0.06)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--primary)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {prepLoadingId === cadence.id ? 'sync' : 'auto_awesome'}
                  </span>
                  {prepLoadingId === cadence.id ? 'Generating…' : 'Generate Prep'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 6. Recent Activity (col-12) ── */}
        <div
          className="col-span-12 p-6 rounded-xl"
          style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
        >
          <h3 className="font-headline font-bold text-lg mb-4" style={{ color: 'var(--on-surface)' }}>
            Recent Activity
          </h3>
          <div className="space-y-3">
            {(activityData?.activities ?? []).slice(0, 10).map((a: {
              id: string; type: string; note?: string; authorName?: string;
              task?: { title: string; id: string }; createdAt: string
            }) => (
              <div key={a.id} className="flex gap-3 items-start">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: 'var(--primary)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--on-surface)' }}>
                    {a.type === 'comment'
                      ? <><span className="font-semibold">{a.authorName ?? 'Someone'}</span>{' commented on '}<span style={{ color: 'var(--primary)' }}>{a.task?.title}</span></>
                      : <><span style={{ color: 'var(--primary)' }}>{a.task?.title ?? 'Task'}</span>{' — '}{a.type.replace(/_/g, ' ')}</>
                    }
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--outline)' }}>
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {!(activityData?.activities?.length) && (
              <p className="text-sm" style={{ color: 'var(--outline)' }}>No activity yet.</p>
            )}
          </div>
        </div>

        {/* ── 7. Automation (col-12) ── */}
        {isOperator && (
          <div className="col-span-12">
            <button
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl text-left transition-colors cursor-pointer"
              style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
              onClick={() => setAutomationOpen(v => !v)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-lowest)'}
            >
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>Automation Status</span>
                <span className="text-xs ml-2" style={{ color: 'var(--on-surface-variant)' }}>Failsafe triggers</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--on-surface-variant)' }}>
                {automationOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {automationOpen && (
              <div
                className="px-6 py-4 space-y-4 -mt-2 rounded-b-xl"
                style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-card)' }}
              >
                {[
                  { label: 'Sync Sheets', sub: 'Pull latest data from Google Sheets', loading: syncingSheets, onClick: handleSyncSheets, icon: 'sync' },
                  { label: 'Generate All Prep Tasks', sub: `Runs for all ${activeCadences.length} active cadence${activeCadences.length !== 1 ? 's' : ''}`, loading: generatingPrep, onClick: handleGenerateAllPrep, icon: 'auto_awesome' },
                  { label: 'Generate & Email Weekly Report', sub: 'Creates report and sends via Gmail', loading: generatingReport, onClick: handleGenerateReport, icon: 'mail' },
                ].map((item, i) => (
                  <div key={i}>
                    {i > 0 && <div className="h-px" style={{ background: 'var(--border)' }} />}
                    <div className="flex items-center justify-between gap-4 pt-3">
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>{item.label}</div>
                        <div className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{item.sub}</div>
                      </div>
                      <Button variant="outline" size="sm" disabled={item.loading} onClick={item.onClick}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.icon}</span>
                        {item.loading ? 'Working…' : item.label.split(' ')[0]}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
