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
import { Button, buttonVariants } from '@/components/ui/button'
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

interface CalendarTask {
  id: string; title: string; priority: string; status: string; startKey: string; endKey: string
}
interface BriefTask {
  id: string; title: string; status: string; priority: string
  startDate: string | null; endDate: string | null; dueDate: string | null
  completedAt: string | null
}
interface MemberBrief {
  member: { id: string; name: string; email: string; role: string; avatarUrl: string | null; teamMemberId: string | null; department: string | null; title: string | null }
  date: string
  weekStart: string
  weekEnd: string
  monthStart: string
  monthEnd: string
  counts: {
    scheduledToday: number; inProgress: number; blocked: number
    completedToday: number; overdue: number
    followUpsActionedToday: number; tasksCreatedToday: number
  }
  todaysTasks: BriefTask[]
  completedToday: BriefTask[]
  inProgress: BriefTask[]
  blocked: BriefTask[]
  overdue: BriefTask[]
  tasksCreatedToday: BriefTask[]
  followUpsActionedToday: Array<{ id: string; title: string; contactName: string; status: string; lastActivityAt: string }>
  commentsToday: Array<{ id: string; taskTitle: string; note: string; authorName: string | null; createdAt: string }>
  weekSnapshot: CalendarTask[]
  monthSnapshot: CalendarTask[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data)

const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d', high: '#865400', medium: '#f8a010', low: '#a9b4b9',
}
// Match the Calendar's Stage palette so the same task reads the same in
// both surfaces. Used for calendar snapshot chips below.
const STAGE_HEX: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}
function dayKey(iso: string): string {
  // Server emits IST calendar-day keys; mirror that on the client so
  // calendar cells line up with the snapshot's startKey/endKey buckets.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}

// IST calendar date "YYYY-MM-DD" for the given UTC instant. The API
// interprets the date param as an IST calendar day, so sending UTC date
// (toISOString().slice(0,10)) skews everything by 5.5 hours.
function istDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d)
}

export default function ReportsPage() {
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const dateStr = istDateString(anchor)

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
  function goToday() { setAnchor(new Date()) }

  const [sendingChannel, setSendingChannel] = useState<'email' | 'whatsapp' | null>(null)

  async function sendBrief(channel: 'email' | 'whatsapp') {
    if (!brief) return
    setSendingChannel(channel)
    try {
      const res = await fetch(`/api/reports/member/${brief.member.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, date: dateStr }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body?.error ?? 'Failed to send')
        return
      }
      if (channel === 'email') {
        toast.success(`Brief sent to ${body.data?.to}`)
      } else {
        if (body.data?.link) {
          // wa.me deeplink — open in new tab. The user taps Send in WhatsApp.
          window.open(body.data.link, '_blank', 'noopener,noreferrer')
          if (!body.data.hasPhone) {
            toast.info('No phone on file — WhatsApp will let you pick a contact.')
          } else {
            toast.success('WhatsApp opened with the brief pre-filled.')
          }
        }
      }
    } catch {
      toast.error('Network error sending brief')
    } finally {
      setSendingChannel(null)
    }
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
                  <a
                    href={`/reports/print/${brief.member.id}?date=${dateStr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ size: 'sm' }) + ' gap-1.5'}
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </a>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => sendBrief('email')}
                    disabled={sendingChannel !== null}
                    className="gap-1.5"
                    title={`Send to ${brief.member.email}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {sendingChannel === 'email' ? 'Sending…' : 'Email'}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => sendBrief('whatsapp')}
                    disabled={sendingChannel !== null}
                    className="gap-1.5"
                    title="Open WhatsApp with the brief pre-filled"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {sendingChannel === 'whatsapp' ? 'Opening…' : 'WhatsApp'}
                  </Button>
                </div>
              </div>

              {/* Stat tiles — order mirrors the section order below */}
              <div className="grid grid-cols-6 gap-2">
                <StatTile label="In Progress" value={brief.counts.inProgress} accent="#f8a010" />
                <StatTile label="Overdue" value={brief.counts.overdue} accent={brief.counts.overdue > 0 ? '#ef4444' : 'var(--on-surface-variant)'} />
                <StatTile label="Done Today" value={brief.counts.completedToday} accent="#2e7d32" />
                <StatTile label="Blocked / Review" value={brief.counts.blocked} accent="#c62828" />
                <StatTile label="Follow-ups" value={brief.counts.followUpsActionedToday} accent="#7c3aed" />
                <StatTile label="New Today" value={brief.counts.tasksCreatedToday} accent="var(--primary)" />
              </div>

              {/* 1. In Progress (point-in-time snapshot) */}
              <BriefSection title={`In Progress (${brief.inProgress.length})`} accent="#f8a010">
                {brief.inProgress.length === 0 ? (
                  <EmptyLine text="Nothing actively in progress." />
                ) : (
                  <TaskList items={brief.inProgress} statusTone="#f8a010" />
                )}
              </BriefSection>

              {/* 2. Overdue */}
              <BriefSection title={`Overdue (${brief.overdue.length})`} accent="#ef4444">
                {brief.overdue.length === 0 ? (
                  <EmptyLine text="Nothing overdue. 👌" />
                ) : (
                  <ul className="space-y-1">
                    {brief.overdue.map(t => {
                      const endIso = t.endDate ?? t.dueDate
                      const daysLate = endIso
                        ? Math.max(1, Math.round((new Date(brief.date).getTime() - new Date(endIso).getTime()) / 86_400_000))
                        : 0
                      return (
                        <li key={t.id} className="flex items-center gap-3 px-2.5 py-2 rounded"
                          style={{ background: 'rgba(239,68,68,0.06)', boxShadow: 'inset 3px 0 0 #ef4444' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: PRIORITY_HEX[t.priority] ?? '#a9b4b9' }} />
                          <span className="flex-1 text-sm" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
                          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#ef4444' }}>
                            {daysLate}d late
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </BriefSection>

              {/* 3. Done Today */}
              <BriefSection title={`Done Today (${brief.completedToday.length})`} accent="#2e7d32">
                {brief.completedToday.length === 0 ? (
                  <EmptyLine text="No tasks marked done today." />
                ) : (
                  <ul className="space-y-1">
                    {brief.completedToday.map(t => (
                      <li key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded"
                        style={{ background: 'rgba(46,125,50,0.06)', boxShadow: 'inset 3px 0 0 #2e7d32' }}>
                        <span style={{ color: '#2e7d32' }}>✓</span>
                        <span className="flex-1 text-sm line-through" style={{ color: 'var(--on-surface-variant)' }}>{t.title}</span>
                        {t.completedAt && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                            {new Date(t.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </BriefSection>

              {/* 4. Blocked / In Review (in_review bucketed here per user request) */}
              <BriefSection title={`Blocked / In Review (${brief.blocked.length})`} accent="#c62828">
                {brief.blocked.length === 0 ? (
                  <EmptyLine text="Nothing blocked or in review." />
                ) : (
                  <ul className="space-y-1">
                    {brief.blocked.map(t => (
                      <li key={t.id} className="flex items-center gap-3 px-2.5 py-2 rounded"
                        style={{ background: 'rgba(198,40,40,0.06)', boxShadow: 'inset 3px 0 0 #c62828' }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PRIORITY_HEX[t.priority] ?? '#a9b4b9' }} />
                        <span className="flex-1 text-sm" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: t.status === 'review' ? '#7c3aed' : '#c62828' }}>
                          {t.status === 'review' ? 'in review' : 'blocked'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </BriefSection>

              {/* 5. Follow-ups actioned today */}
              <BriefSection title={`Follow-ups Actioned Today (${brief.followUpsActionedToday.length})`} accent="#7c3aed">
                {brief.followUpsActionedToday.length === 0 ? (
                  <EmptyLine text="No follow-ups touched today." />
                ) : (
                  <ul className="space-y-1">
                    {brief.followUpsActionedToday.map(f => (
                      <li key={f.id} className="flex items-center gap-3 px-2.5 py-2 rounded"
                        style={{ background: 'var(--surface-container-low)' }}>
                        <span className="text-sm flex-1" style={{ color: 'var(--on-surface)' }}>
                          {f.title}
                          <span style={{ color: 'var(--on-surface-variant)' }}> · {f.contactName}</span>
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#7c3aed' }}>
                          {f.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </BriefSection>

              {/* 5. Tasks created today */}
              <BriefSection title={`New Tasks Today (${brief.tasksCreatedToday.length})`} accent="var(--primary)">
                {brief.tasksCreatedToday.length === 0 ? (
                  <EmptyLine text="No tasks created today." />
                ) : (
                  <TaskList items={brief.tasksCreatedToday} />
                )}
              </BriefSection>

              {/* 6. Comments updated today */}
              <BriefSection title={`Comments Updated Today (${brief.commentsToday.length})`}>
                {brief.commentsToday.length === 0 ? (
                  <EmptyLine text="No comments posted today." />
                ) : (
                  <div className="space-y-2">
                    {brief.commentsToday.map(c => (
                      <div key={c.id} className="pl-3 py-1.5" style={{ borderLeft: '2px solid var(--primary)' }}>
                        <div className="text-[11px] font-bold" style={{ color: 'var(--on-surface)' }}>{c.taskTitle}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}
                          dangerouslySetInnerHTML={{ __html: c.note }} />
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                          {c.authorName ?? 'System'} · {new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </BriefSection>

              {/* Monthly calendar snapshot */}
              <BriefSection title={`This Month's Calendar — ${new Date(brief.monthStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}>
                <MonthSnapshot brief={brief} />
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

function BriefSection({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2 pb-1"
        style={{ color: accent ?? 'var(--on-surface)', borderBottom: `1px solid ${accent ?? 'var(--surface-container-high)'}` }}>{title}</h3>
      {children}
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs italic" style={{ color: 'var(--on-surface-variant)' }}>{text}</p>
}

// Reusable task row list — used for In Progress + New Tasks Today.
function TaskList({ items, statusTone }: { items: BriefTask[]; statusTone?: string }) {
  return (
    <ul className="space-y-1">
      {items.map(t => (
        <li key={t.id} className="flex items-center gap-3 px-2.5 py-2 rounded"
          style={{ background: 'var(--surface-container-low)' }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: PRIORITY_HEX[t.priority] ?? '#a9b4b9' }} />
          <span className="flex-1 text-sm" style={{ color: 'var(--on-surface)' }}>{t.title}</span>
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: statusTone ?? 'var(--on-surface-variant)' }}>
            {t.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  )
}

// Month-view calendar snapshot. Each day cell shows the full title of every
// task whose [start..end] range overlaps that day — no truncation, wraps as
// needed. Multi-day tasks repeat in each spanned cell so nothing gets hidden.
function MonthSnapshot({ brief }: { brief: MemberBrief }) {
  const monthStart = new Date(brief.monthStart)
  const monthEnd = new Date(brief.monthEnd)
  // Calendar grid starts on the Sunday on/before the 1st.
  const gridStart = new Date(monthStart); gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  // 6 weeks × 7 = 42 cells to safely cover every month layout.
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d) }
  // Trim trailing whole weeks that fall fully outside the month for compactness.
  while (cells.length >= 35 && cells[cells.length - 7].getTime() > monthEnd.getTime()) cells.splice(cells.length - 7, 7)
  const rowCount = Math.ceil(cells.length / 7)

  // Bucket tasks per day key.
  const perDay = new Map<string, CalendarTask[]>()
  for (const t of brief.monthSnapshot) {
    const s = new Date(t.startKey).getTime()
    const e = new Date(t.endKey).getTime()
    for (const d of cells) {
      const k = dayKey(d.toISOString())
      const dt = d.getTime()
      if (dt >= s && dt <= e) {
        if (!perDay.has(k)) perDay.set(k, [])
        perDay.get(k)!.push(t)
      }
    }
  }

  const todayKey = dayKey(brief.date)

  return (
    <div className="rounded overflow-hidden" style={{ background: 'var(--surface-container-low)' }}>
      {/* Weekday header */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {DAY_NAMES.map(n => (
          <div key={n} className="px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--on-surface-variant)' }}>{n}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: `repeat(${rowCount}, minmax(96px, auto))` }}>
        {cells.map(d => {
          const k = dayKey(d.toISOString())
          const inMonth = d.getMonth() === monthStart.getMonth()
          const today = k === todayKey
          const items = perDay.get(k) ?? []
          return (
            <div key={k} className="border-l border-t p-1.5 flex flex-col gap-1 overflow-hidden"
              style={{
                borderColor: 'var(--surface-container)',
                background: today ? 'var(--surface-container)' : 'var(--surface)',
                opacity: inMonth ? 1 : 0.45,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tabular-nums"
                  style={{ color: today ? 'var(--primary)' : 'var(--on-surface)' }}>{d.getDate()}</span>
                {items.length > 0 && (
                  <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                    style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}>
                    {items.length}
                  </span>
                )}
              </div>
              {items.map(t => {
                const color = STAGE_HEX[t.status] ?? STAGE_HEX.todo
                return (
                  <div key={`${k}-${t.id}`}
                    className="text-[10px] leading-tight px-1.5 py-1 rounded"
                    style={{
                      background: `${color}20`,
                      borderLeft: `2px solid ${color}`,
                      color: 'var(--on-surface)',
                      wordBreak: 'break-word',
                    }}
                    title={`${t.title} · ${t.status.replace('_', ' ')}`}
                  >{t.title}</div>
                )
              })}
            </div>
          )
        })}
      </div>
      {brief.monthSnapshot.length === 0 && (
        <p className="text-center text-xs italic py-3" style={{ color: 'var(--on-surface-variant)' }}>
          Nothing on the calendar this month.
        </p>
      )}
    </div>
  )
}
