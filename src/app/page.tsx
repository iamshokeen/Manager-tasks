'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useTasks } from '@/hooks/use-tasks'
import { useTeam } from '@/hooks/use-team'
import { useCadences } from '@/hooks/use-cadences'
import { StatCard } from '@/components/ui/stat-card'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { Button } from '@/components/ui/button'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { isOverdue, isDueToday, isDueSoon, formatDate } from '@/lib/utils'
import { formatCrore } from '@/lib/format'
import { RefreshCw, Zap, Mail, ChevronDown, ChevronUp, BarChart3, TrendingUp, Hotel, Users, FileText, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const BENTO_FEATURES = [
  { name: 'Metrics', description: 'FY27 KPIs — funnel, revenue, OTA attainment', href: '/metrics', cta: 'View metrics', Icon: BarChart3, className: 'col-span-1' },
  { name: 'OTA Assessment', description: 'Gross GMV, channel mix, region split vs targets', href: '/assessment/ota', cta: 'View OTA', Icon: TrendingUp, className: 'col-span-1' },
  { name: 'Check-in GMV', description: 'CI revenue, ARR, weekday vs weekend breakdown', href: '/assessment/checkin', cta: 'View check-in', Icon: Hotel, className: 'col-span-1' },
  { name: 'Team', description: 'Member profiles, roles, and open task counts', href: '/team', cta: 'View team', Icon: Users, className: 'col-span-1' },
  { name: 'Reports', description: 'Weekly snapshots and stakeholder summaries', href: '/reports', cta: 'View reports', Icon: FileText, className: 'col-span-1' },
  { name: 'Playbook', description: 'SOPs, onboarding guides, and team references', href: '/playbook', cta: 'View playbook', Icon: BookOpen, className: 'col-span-1' },
]


const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export default function DashboardPage() {
  const { tasks, isLoading: tasksLoading } = useTasks()
  const { members, isLoading: teamLoading } = useTeam()
  const { data: metricsData, isLoading: numbersLoading } = useSWR('/api/metrics', fetcher)
  const { data: targetsData } = useSWR('/api/targets', fetcher)
  const { cadences, isLoading: cadencesLoading } = useCadences()

  const [automationOpen, setAutomationOpen] = useState(false)
  const [syncingSheets, setSyncingSheets] = useState(false)
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [prepLoadingId, setPrepLoadingId] = useState<string | null>(null)

  // ── Stat computations ─────────────────────────────────────────────────────
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

  // ── Revenue KPI ───────────────────────────────────────────────────────────
  const metrics: Record<string, number> = metricsData?.data ?? {}
  const checkinValue = metrics['ci_revenue_ytd'] ?? null
  const otaValue = metrics['ota_gross_gmv_ytd'] ?? null
  const hasRevenue = !!(checkinValue || otaValue)
  const latestSyncedAt: string | undefined = undefined
  const CHECKIN_TARGET: number = targetsData?.targets?.checkin?.ytd?.total ?? 851_910_648
  const OTA_TARGET: number = targetsData?.targets?.ota?.ytd?.revenue ?? 34_319_608

  // ── Priority tasks (top 5 open by priority) ────────────────────────────
  const priorityTasks = [...openTasks]
    .sort((a: { priority: string; dueDate?: string | null }, b: { priority: string; dueDate?: string | null }) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99
      const pb = PRIORITY_ORDER[b.priority] ?? 99
      if (pa !== pb) return pa - pb
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
    .slice(0, 5)

  // ── Team open task count map ───────────────────────────────────────────
  const memberTaskCount: Record<string, number> = {}
  for (const t of openTasks as Array<{ assigneeId?: string | null }>) {
    if (t.assigneeId) {
      memberTaskCount[t.assigneeId] = (memberTaskCount[t.assigneeId] ?? 0) + 1
    }
  }

  // ── Active cadences ───────────────────────────────────────────────────
  const activeCadences = (cadences as Array<{ id: string; name: string; day: string; time: string; scope: string; isActive: boolean }>)
    .filter((c) => c.isActive)

  // ── Failsafe handlers ─────────────────────────────────────────────────
  async function handleSyncSheets() {
    setSyncingSheets(true)
    try {
      const res = await fetch('/api/numbers/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      toast.success('Sheets synced successfully')
    } catch {
      toast.error('Sheets sync failed')
    } finally {
      setSyncingSheets(false)
    }
  }

  async function handleGenerateAllPrep() {
    setGeneratingPrep(true)
    try {
      for (const cadence of activeCadences) {
        await fetch('/api/cadence/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cadenceId: cadence.id }),
        })
      }
      toast.success('Prep tasks generated for all cadences')
    } catch {
      toast.error('Failed to generate prep tasks')
    } finally {
      setGeneratingPrep(false)
    }
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function handlePrepNow(cadenceId: string) {
    setPrepLoadingId(cadenceId)
    try {
      const res = await fetch('/api/cadence/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadenceId }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Prep tasks generated')
    } catch {
      toast.error('Failed to generate prep tasks')
    } finally {
      setPrepLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <TextShimmer as="h1" className="text-2xl font-bold" duration={3}>
          Command Center
        </TextShimmer>
        <p className="text-muted-foreground text-sm mt-1">Lohono Revenue &amp; Team Dashboard</p>
      </div>

      {/* ── 0. Quick Nav ─────────────────────────────────────────────────── */}
      <section>
        <BentoGrid className="grid-cols-3 auto-rows-[9rem]">
          {BENTO_FEATURES.map((f) => (
            <BentoCard key={f.href} {...f} background={null} />
          ))}
        </BentoGrid>
      </section>

      {/* ── 1. Stat Row ──────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Open Tasks"
            value={tasksLoading ? '—' : openTasks.length}
            sub="Not yet done"
            accent="blue"
          />
          <StatCard
            label="Overdue"
            value={tasksLoading ? '—' : overdueTasks.length}
            sub="Past due date"
            accent="red"
          />
          <StatCard
            label="Due Today"
            value={tasksLoading ? '—' : dueTodayTasks.length}
            sub="Due today"
            accent="gold"
          />
          <StatCard
            label="Due This Week"
            value={tasksLoading ? '—' : dueThisWeekTasks.length}
            sub="Within 7 days"
            accent="green"
          />
        </div>
      </section>

      {/* ── 2. Revenue KPI ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Revenue KPIs
        </h2>
        <div className="bg-white rounded-xl p-6 shadow-[0_20px_40px_rgba(0,74,198,0.06)]">
          {numbersLoading ? (
            <div className="text-sm text-muted-foreground">Loading revenue data…</div>
          ) : !hasRevenue ? (
            <div className="text-sm text-muted-foreground italic">
              No revenue data — sync from Sheets to populate KPIs.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Check-in Revenue */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Check-in Revenue</span>
                  <span className="text-xs text-muted-foreground">
                    Target {formatCrore(CHECKIN_TARGET)}
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-primary mb-2">
                  {checkinValue !== null ? formatCrore(checkinValue) : '—'}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: checkinValue !== null
                        ? `${Math.min(100, (checkinValue / CHECKIN_TARGET) * 100).toFixed(1)}%`
                        : '0%',
                    }}
                  />
                </div>
                {checkinValue !== null && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {((checkinValue / CHECKIN_TARGET) * 100).toFixed(1)}% of target
                  </div>
                )}
              </div>

              {/* OTA Bookings */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">OTA Gross GMV</span>
                  <span className="text-xs text-muted-foreground">
                    Target {formatCrore(OTA_TARGET)}
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-primary mb-2">
                  {otaValue !== null ? formatCrore(otaValue) : '—'}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{
                      width: otaValue !== null
                        ? `${Math.min(100, (otaValue / OTA_TARGET) * 100).toFixed(1)}%`
                        : '0%',
                    }}
                  />
                </div>
                {otaValue !== null && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {((otaValue / OTA_TARGET) * 100).toFixed(1)}% of target
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Priority Tasks ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Priority Tasks
          </h2>
          <Link href="/tasks" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-[0_20px_40px_rgba(0,74,198,0.06)]">
          {tasksLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading tasks…</div>
          ) : priorityTasks.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No open tasks. Nice work!</div>
          ) : (
            <div className="divide-y divide-border">
            {priorityTasks.map((task: {
              id: string
              title: string
              priority: string
              dueDate?: string | null
              assignee?: { id: string; name: string } | null
            }) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--surface-container-low)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
                  {task.dueDate && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Due {formatDate(task.dueDate)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  {task.assignee && (
                    <div className="flex items-center gap-1.5">
                      <MemberAvatar name={task.assignee.name} size="sm" />
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {task.assignee.name}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Team Snapshot ─────────────────────────────────────────────── */}
      <section>
        <div className="bg-white rounded-xl p-6 shadow-[0_20px_40px_rgba(0,74,198,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Team Snapshot
            </h2>
            <Link href="/team" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {teamLoading ? (
            <div className="col-span-full text-sm text-muted-foreground">Loading team…</div>
          ) : (members as Array<{ id: string; name: string; role: string; department: string; status: string }>)
              .filter((m) => m.status === 'active')
              .map((member) => (
                <Link
                  key={member.id}
                  href={`/team/${member.id}`}
                  className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-[0_20px_40px_rgba(0,74,198,0.06)] hover:-translate-y-0.5 transition-all"
                >
                  <MemberAvatar name={member.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                  </div>
                  {(memberTaskCount[member.id] ?? 0) > 0 && (
                    <span className="shrink-0 text-xs font-mono font-semibold bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                      {memberTaskCount[member.id]}
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ── 5. This Week's Cadences ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            This Week&apos;s Cadences
          </h2>
          <Link href="/cadence" className="text-xs text-primary hover:underline">
            Manage
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-[0_20px_40px_rgba(0,74,198,0.06)] divide-y divide-border">
          {cadencesLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading cadences…</div>
          ) : activeCadences.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No active cadences configured.</div>
          ) : (
            activeCadences.map((cadence) => (
              <div key={cadence.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{cadence.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cadence.day} at {cadence.time} · {cadence.scope}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={prepLoadingId === cadence.id}
                  onClick={() => handlePrepNow(cadence.id)}
                >
                  {prepLoadingId === cadence.id ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Zap className="size-3" />
                  )}
                  Prep Now
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 6. Automation Status (Failsafe Panel) ────────────────────────── */}
      <section>
        <button
          className="w-full flex items-center justify-between bg-white rounded-xl shadow-[0_20px_40px_rgba(0,74,198,0.06)] px-6 py-4 text-left hover:bg-[var(--surface-container-low)] transition-colors"
          onClick={() => setAutomationOpen((v) => !v)}
        >
          <div>
            <span className="text-sm font-semibold text-foreground">Automation Status</span>
            <span className="text-xs text-muted-foreground ml-2">Failsafe triggers</span>
          </div>
          {automationOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {automationOpen && (
          <div className="bg-white rounded-b-xl shadow-[0_20px_40px_rgba(0,74,198,0.06)] px-6 py-4 space-y-3 -mt-3 pt-6">
            {/* Sync Sheets */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground">Sync Sheets</div>
                <div className="text-xs text-muted-foreground">
                  {latestSyncedAt
                    ? `Last synced ${formatDate(latestSyncedAt)}`
                    : 'Never synced'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={syncingSheets}
                onClick={handleSyncSheets}
              >
                {syncingSheets ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                {syncingSheets ? 'Syncing…' : 'Sync Now'}
              </Button>
            </div>

            <div className="border-t border-border" />

            {/* Generate All Prep Tasks */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground">Generate All Prep Tasks</div>
                <div className="text-xs text-muted-foreground">
                  Runs for all {activeCadences.length} active cadence{activeCadences.length !== 1 ? 's' : ''}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={generatingPrep || activeCadences.length === 0}
                onClick={handleGenerateAllPrep}
              >
                {generatingPrep ? (
                  <Zap className="size-3 animate-pulse" />
                ) : (
                  <Zap className="size-3" />
                )}
                {generatingPrep ? 'Generating…' : 'Generate'}
              </Button>
            </div>

            <div className="border-t border-border" />

            {/* Generate Weekly Report + Email */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground">Generate &amp; Email Weekly Report</div>
                <div className="text-xs text-muted-foreground">
                  Creates report and sends via Gmail
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={generatingReport}
                onClick={handleGenerateReport}
              >
                {generatingReport ? (
                  <Mail className="size-3 animate-pulse" />
                ) : (
                  <Mail className="size-3" />
                )}
                {generatingReport ? 'Sending…' : 'Send Report'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
