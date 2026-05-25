'use client'
//
// Team Reports — Daily Briefs control room.
//
// Left rail: roster of visible team members + bulk dispatch controls.
// Right pane: live JSON-driven preview of the selected member's daily brief
// (mirrors the /reports/print/[userId] layout), with per-member buttons to
// Download PDF, plus stubbed Email / WhatsApp dispatch (wiring later).
//

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, Users as UsersIcon,
  Mail, MessageSquare, RefreshCw, FileText, Loader2,
} from 'lucide-react'
import { MemberAvatar } from '@/components/ui/member-avatar'

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
}

interface RosterPayload {
  period: Period
  rangeStart: string
  rangeEnd: string
  rows: ReportRow[]
}

interface MemberBrief {
  member: { id: string; name: string; email: string; role: string; avatarUrl: string | null; teamMemberId: string | null; department: string | null; title: string | null }
  date: string
  weekStart: string
  weekEnd: string
  counts: { scheduledToday: number; inProgress: number; blocked: number; completedToday: number; overdue: number }
  todaysTasks: Array<{ id: string; title: string; status: string; priority: string; startDate: string | null; endDate: string | null; dueDate: string | null }>
  completedToday: Array<{ id: string; title: string; completedAt: string | null }>
  inProgress: Array<{ id: string; title: string; status: string; priority: string }>
  blocked: Array<{ id: string; title: string; priority: string }>
  recentComments: Array<{ id: string; taskTitle: string; note: string; authorName: string | null; createdAt: string }>
  weekSnapshot: Array<{ id: string; title: string; priority: string; status: string; startKey: string; endKey: string }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data)

const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d', high: '#865400', medium: '#f8a010', low: '#a9b4b9',
}
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function dayKey(iso: string): string { return iso.split('T')[0] }
function addDaysISO(iso: string, n: number): string { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString() }

export default function ReportsPage() {
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const dateStr = anchor.toISOString().slice(0, 10)

  const { data: roster, isLoading: rosterLoading, mutate: refreshRoster } =
    useSWR<RosterPayload>(`/api/reports?period=daily&date=${dateStr}`, fetcher)

  // Auto-select the first member when roster loads.
  useEffect(() => {
    if (!selectedUserId && roster && roster.rows.length > 0) {
      setSelectedUserId(roster.rows[0].userId)
    }
  }, [roster, selectedUserId])

  const { data: brief, isLoading: briefLoading } = useSWR<MemberBrief>(
    selectedUserId ? `/api/reports/member/${selectedUserId}?date=${dateStr}` : null,
    fetcher
  )

  function shiftDay(direction: -1 | 1) {
    setAnchor(a => { const d = new Date(a); d.setDate(d.getDate() + direction); return d })
  }
  function goToday() { const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d) }

  function downloadPdf(userId: string) {
    const url = `/reports/print/${userId}?date=${dateStr}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Daily Reports"
        description="Per-member tactical brief — what's planned, in motion, done, and stuck"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refreshRoster()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Date stepper */}
      <div className="flex items-center gap-3 mb-4 flex-wrap px-4 py-3 rounded-lg"
        style={{ background: 'var(--surface-container)' }}>
        <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: 'var(--surface-container-high)' }}>
          <button onClick={() => shiftDay(-1)} className="p-1 rounded cursor-pointer" title="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            <CalendarIcon className="h-3.5 w-3.5" style={{ color: 'var(--on-surface-variant)' }} />
            <span className="font-mono">{fmtDate(anchor.toISOString())}</span>
          </div>
          <button onClick={() => shiftDay(1)} className="p-1 rounded cursor-pointer" title="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToday}>Today</Button>
        {roster && (
          <div className="ml-auto flex items-center gap-4 text-xs font-semibold" style={{ color: 'var(--on-surface-variant)' }}>
            <span><UsersIcon className="inline h-3 w-3 mr-1" /> {roster.rows.length} members in view</span>
          </div>
        )}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-[340px_1fr] gap-4 flex-1 overflow-hidden">

        {/* ── Left rail: team roster ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2 overflow-y-auto rounded-lg p-3"
          style={{ background: 'var(--surface-container-low)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
              Team
            </span>
            {roster && (
              <span className="text-[10px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                {roster.rows.length} member{roster.rows.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {rosterLoading && (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--on-surface-variant)' }}>Loading…</p>
          )}
          {roster && roster.rows.length === 0 && (
            <EmptyState icon={<UsersIcon className="h-8 w-8" />} title="No team in view" description="No one reports up to you yet." />
          )}
          {roster && roster.rows.map(row => {
            const selected = row.userId === selectedUserId
            const ring = row.tasksOverdue > 0 ? '#ef4444' : row.tasksInProgress > 0 ? '#f8a010' : 'rgba(71,234,237,0.6)'
            return (
              <button
                key={row.userId}
                onClick={() => setSelectedUserId(row.userId)}
                className="text-left p-3 rounded-lg cursor-pointer transition-all hover:brightness-110"
                style={{
                  background: selected ? 'var(--surface-container-high)' : 'var(--surface-container)',
                  boxShadow: selected ? 'inset 0 0 0 1px var(--primary)' : undefined,
                }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="rounded-full p-[2px]" style={{ background: ring }}>
                    <MemberAvatar name={row.name} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>{row.name}</div>
                    <div className="text-[10px] uppercase tracking-wider truncate" style={{ color: 'var(--on-surface-variant)' }}>
                      {row.role.replace('_', ' ').toLowerCase()}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono tabular-nums" style={{ color: 'var(--on-surface-variant)' }}>
                      <span><span style={{ color: 'var(--on-surface)' }}>{row.tasksInProgress}</span> active</span>
                      <span><span style={{ color: '#2e7d32' }}>{row.tasksCompleted}</span> done</span>
                      {row.tasksOverdue > 0 && <span style={{ color: '#ef4444' }}>{row.tasksOverdue} late</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Right pane: preview ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 overflow-y-auto rounded-lg p-4"
          style={{ background: 'var(--surface)' }}>
          {!selectedUserId && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <FileText className="h-10 w-10" style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                Select a team member from the left to preview their brief.
              </p>
            </div>
          )}

          {selectedUserId && briefLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--primary)' }} />
              <p className="text-sm font-mono uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                Rendering brief…
              </p>
            </div>
          )}

          {selectedUserId && brief && (
            <>
              {/* Action toolbar */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                    Tactical Brief
                  </div>
                  <h2 className="text-xl font-bold mt-0.5" style={{ color: 'var(--on-surface)' }}>{brief.member.name}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                    {[brief.member.title, brief.member.department].filter(Boolean).join(' · ') || brief.member.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => downloadPdf(brief.member.id)} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info('Email dispatch coming soon')} className="gap-1.5" title="Coming soon">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info('WhatsApp dispatch coming soon')} className="gap-1.5" title="Coming soon">
                    <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                </div>
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-5 gap-2">
                <StatTile label="Scheduled" value={brief.counts.scheduledToday} accent="var(--primary)" />
                <StatTile label="In Progress" value={brief.counts.inProgress} accent="#f8a010" />
                <StatTile label="Blocked" value={brief.counts.blocked} accent="#c62828" />
                <StatTile label="Done" value={brief.counts.completedToday} accent="#2e7d32" />
                <StatTile label="Overdue" value={brief.counts.overdue} accent={brief.counts.overdue > 0 ? '#ef4444' : 'var(--on-surface-variant)'} />
              </div>

              {/* Today's Tasks */}
              <BriefSection title={`Today's Tasks (${brief.todaysTasks.length})`}>
                {brief.todaysTasks.length === 0 ? (
                  <EmptyLine text="No tasks scheduled for today." />
                ) : (
                  <ul className="space-y-1">
                    {brief.todaysTasks.map(t => (
                      <li key={t.id} className="flex items-center gap-3 px-2.5 py-2 rounded"
                        style={{ background: 'var(--surface-container-low)' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PRIORITY_HEX[t.priority] ?? '#a9b4b9' }} />
                        <span className="flex-1 text-sm truncate" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </BriefSection>

              {/* Recent comments */}
              <BriefSection title={`Progress Notes (${brief.recentComments.length})`}>
                {brief.recentComments.length === 0 ? (
                  <EmptyLine text="No comments in the last 7 days." />
                ) : (
                  <div className="space-y-2">
                    {brief.recentComments.slice(0, 4).map(c => (
                      <div key={c.id} className="pl-3 py-1.5" style={{ borderLeft: '2px solid var(--primary)' }}>
                        <div className="text-[11px] font-bold" style={{ color: 'var(--on-surface)' }}>{c.taskTitle}</div>
                        <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--on-surface-variant)' }}
                          dangerouslySetInnerHTML={{ __html: c.note }} />
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                          {c.authorName ?? 'System'} · {fmtShortDate(c.createdAt)}
                        </div>
                      </div>
                    ))}
                    {brief.recentComments.length > 4 && (
                      <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>
                        + {brief.recentComments.length - 4} more in PDF
                      </p>
                    )}
                  </div>
                )}
              </BriefSection>

              {/* Completed today */}
              <BriefSection title={`Completed Today (${brief.completedToday.length})`}>
                {brief.completedToday.length === 0 ? (
                  <EmptyLine text="No tasks marked done today." />
                ) : (
                  <ul className="space-y-1">
                    {brief.completedToday.map(t => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span style={{ color: '#2e7d32' }}>✓</span>
                        <span className="line-through" style={{ color: 'var(--on-surface-variant)' }}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </BriefSection>

              {/* Week calendar snapshot */}
              <BriefSection title="This Week's Calendar">
                <WeekSnapshot brief={brief} />
              </BriefSection>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded p-2.5" style={{ background: 'var(--surface-container-low)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>{label}</div>
      <div className="text-2xl font-bold font-mono tabular-nums mt-0.5" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 pb-1"
        style={{ color: 'var(--on-surface)', borderBottom: '1px solid var(--surface-container-high)' }}>{title}</h3>
      {children}
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>{text}</p>
}

function WeekSnapshot({ brief }: { brief: MemberBrief }) {
  const weekKeys: string[] = []
  for (let i = 0; i < 7; i++) weekKeys.push(dayKey(addDaysISO(brief.weekStart, i)))

  type Laid = { task: typeof brief.weekSnapshot[number]; startIdx: number; endIdx: number; lane: number }
  const sorted = [...brief.weekSnapshot].sort((a, b) => a.startKey.localeCompare(b.startKey))
  const lanes: number[] = []
  const laid: Laid[] = []
  for (const t of sorted) {
    const startIdx = Math.max(0, weekKeys.indexOf(t.startKey))
    const endRaw = weekKeys.indexOf(t.endKey)
    const endIdx = endRaw === -1 ? 6 : Math.min(6, endRaw)
    let lane = lanes.findIndex(n => n <= startIdx)
    if (lane === -1) { lane = lanes.length; lanes.push(0) }
    lanes[lane] = endIdx + 1
    laid.push({ task: t, startIdx, endIdx, lane })
  }
  const laneCount = Math.max(1, lanes.length)
  const todayKey = dayKey(brief.date)

  return (
    <div className="rounded overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {weekKeys.map(k => {
          const d = new Date(k)
          const today = k === todayKey
          return (
            <div key={k} className="px-2 py-1.5 text-center" style={{ background: today ? 'var(--surface-container)' : 'transparent' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: today ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                {DAY_NAMES[d.getDay()]}
              </div>
              <div className="text-sm font-mono font-bold tabular-nums" style={{ color: today ? 'var(--primary)' : 'var(--on-surface)' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="relative" style={{ minHeight: laneCount * 22 + 14 }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekKeys.map(k => <div key={k} style={{ borderLeft: '1px solid var(--surface-container)' }} />)}
        </div>
        {laid.length === 0 && (
          <p className="text-center text-xs italic py-3" style={{ color: 'var(--on-surface-variant)' }}>
            Nothing on the calendar this week.
          </p>
        )}
        {laid.map(({ task, startIdx, endIdx, lane }) => {
          const span = endIdx - startIdx + 1
          const color = PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.low
          return (
            <div
              key={task.id}
              style={{
                position: 'absolute',
                top: lane * 22 + 4, height: 18,
                left: `calc(${(startIdx / 7) * 100}% + 3px)`,
                width: `calc(${(span / 7) * 100}% - 6px)`,
                background: `${color}25`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 2,
                padding: '0 6px',
                display: 'flex', alignItems: 'center',
                fontSize: 10, fontWeight: 600,
                color: 'var(--on-surface)',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}
              title={task.title}
            >{task.title}</div>
          )
        })}
      </div>
    </div>
  )
}
