// src/app/reports/print/[userId]/page.tsx
//
// Server-rendered printable daily brief for a single team member. Opened in
// a new tab from the Reports page; the client wrapper auto-triggers
// window.print() so the user immediately gets the "Save as PDF" dialog.
//
// Visual style mirrors the Stitch "tactical brief" mockup but is fully
// print-safe via the rules in globals.css @media print.

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport, type MemberReportTask, type MemberReportWeekTask } from '@/lib/services/member-report'
import { PrintAutoTrigger } from '@/components/ui/print-auto-trigger'
import { PrintActions } from '@/components/ui/print-actions'
import { istParts, istMidnight, addIstDays, istDayKey } from '@/lib/ist-dates'

const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d',
  high: '#865400', medium: '#f8a010', low: '#a9b4b9',
}
// Calendar snapshot color language — must match the live Calendar's
// Stage palette so a single task reads the same in either surface.
const STAGE_HEX: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}

const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
}
const STATUS_HEX: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

function dayKey(iso: string): string {
  // IST calendar-day key — must match the server's istDayKey() so the
  // month-grid cells bucket against the same dates the snapshot uses.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}
function daysInclusive(startKey: string, endKey: string): number {
  const a = new Date(startKey).getTime(); const b = new Date(endKey).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default async function MemberReportPrintPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ date?: string; auto?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  const me = session.user as { id: string; role?: string }

  const { userId } = await params
  const sp = await searchParams

  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(userId)) redirect('/reports')
  }

  const anchor = sp.date ? new Date(sp.date) : new Date()
  if (Number.isNaN(anchor.getTime())) redirect('/reports')

  const report = await getMemberReport(userId, anchor)
  if (!report) redirect('/reports')

  // Month calendar grid in IST. Building from UTC Date math here would put
  // cells on the wrong day for India users; we anchor every cell to IST
  // midnight and key it by the IST calendar date.
  const monthStart = new Date(report.monthStart)  // = IST midnight day 1 (UTC instant)
  const monthEnd = new Date(report.monthEnd)
  // Walk back to the previous Sunday (in IST) so the grid starts on a Sun.
  const startParts = istParts(monthStart)
  const gridStart = istMidnight(startParts.y, startParts.m, startParts.d - startParts.dow)
  const monthCells: Date[] = []
  for (let i = 0; i < 42; i++) monthCells.push(addIstDays(gridStart, i))
  // Trim trailing whole weeks falling entirely after month-end (in IST).
  while (
    monthCells.length >= 35 &&
    monthCells[monthCells.length - 7].getTime() > monthEnd.getTime()
  ) monthCells.splice(monthCells.length - 7, 7)
  const monthRowCount = Math.ceil(monthCells.length / 7)
  const monthLabel = monthStart.toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  })

  const monthPerDay = new Map<string, MemberReportWeekTask[]>()
  for (const t of report.monthSnapshot) {
    for (const d of monthCells) {
      const k = istDayKey(d)
      if (k >= t.startKey && k <= t.endKey) {
        if (!monthPerDay.has(k)) monthPerDay.set(k, [])
        monthPerDay.get(k)!.push(t)
      }
    }
  }

  const auto = sp.auto !== '0' // default = trigger print on load

  return (
    <div className="print-brief" style={{
      background: '#ffffff', color: '#111111', minHeight: '100vh',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      padding: '32px 40px', maxWidth: 920, margin: '0 auto',
    }}>
      {auto && <PrintAutoTrigger />}

      <PrintActions />

      {/* Header band */}
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: '#0053db', textTransform: 'uppercase' }}>
            Kairos · Tactical Daily Brief
          </span>
          <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: '#555', letterSpacing: '0.08em' }}>
            {fmtDate(report.date)} · IST
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#111' }}>
          {report.member.name}
        </h1>
        <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0 0' }}>
          {[report.member.title, report.member.department, report.member.email].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Counts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 22 }}>
        <StatTile label="In Progress" value={report.counts.inProgress} accent="#865400" />
        <StatTile label="Overdue" value={report.counts.overdue} accent={report.counts.overdue > 0 ? '#c62828' : '#a9b4b9'} />
        <StatTile label="Done Today" value={report.counts.completedToday} accent="#2e7d32" />
        <StatTile label="Blocked / Review" value={report.counts.blocked} accent="#c62828" />
        <StatTile label="Follow-ups" value={report.counts.followUpsActionedToday} accent="#7c3aed" />
        <StatTile label="New Today" value={report.counts.tasksCreatedToday} accent="#0053db" />
      </div>

      {/* 1. In Progress */}
      <Section title={`In Progress (${report.inProgress.length})`} accent="#865400">
        {report.inProgress.length === 0 ? (
          <EmptyLine text="Nothing actively in progress." />
        ) : (
          <TaskTable rows={report.inProgress} />
        )}
      </Section>

      {/* 2. Overdue */}
      <Section title={`Overdue (${report.overdue.length})`} accent="#c62828">
        {report.overdue.length === 0 ? (
          <EmptyLine text="Nothing overdue." />
        ) : (
          <TaskTable rows={report.overdue} highlightOverdue anchorDate={report.date} />
        )}
      </Section>

      {/* 3. Done Today */}
      <Section title={`Done Today (${report.completedToday.length})`} accent="#2e7d32">
        {report.completedToday.length === 0 ? (
          <EmptyLine text="No tasks marked done today." />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.completedToday.map(t => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ color: '#2e7d32', fontWeight: 700 }}>✓</span>
                <span style={{ flex: 1, fontSize: 12, color: '#333', textDecoration: 'line-through' }}>{t.title}</span>
                {t.completedAt && (
                  <span style={{ fontSize: 10, color: '#777', fontFamily: 'ui-monospace, monospace' }}>{fmtTime(t.completedAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 4. Blocked / In Review */}
      <Section title={`Blocked / In Review (${report.blocked.length})`} accent="#c62828">
        {report.blocked.length === 0 ? (
          <EmptyLine text="Nothing blocked or in review." />
        ) : (
          <TaskTable rows={report.blocked} />
        )}
      </Section>

      {/* 5. Follow-ups actioned today */}
      <Section title={`Follow-ups Actioned Today (${report.followUpsActionedToday.length})`} accent="#7c3aed">
        {report.followUpsActionedToday.length === 0 ? (
          <EmptyLine text="No follow-ups touched today." />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.followUpsActionedToday.map(f => (
              <li key={f.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ flex: 1, fontSize: 12, color: '#222' }}>
                  <strong>{f.title}</strong>
                  <span style={{ color: '#777' }}> · {f.contactName}</span>
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#7c3aed',
                }}>{f.status}</span>
                <span style={{ fontSize: 10, color: '#777', fontFamily: 'ui-monospace, monospace' }}>
                  {fmtTime(f.lastActivityAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 5. New tasks created today */}
      <Section title={`New Tasks Today (${report.tasksCreatedToday.length})`} accent="#0053db">
        {report.tasksCreatedToday.length === 0 ? (
          <EmptyLine text="No tasks created today." />
        ) : (
          <TaskTable rows={report.tasksCreatedToday} />
        )}
      </Section>

      {/* 6. Comments updated today */}
      <Section title={`Comments Updated Today (${report.commentsToday.length})`}>
        {report.commentsToday.length === 0 ? (
          <EmptyLine text="No comments posted today." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {report.commentsToday.map(c => (
              <div key={c.id} style={{
                borderLeft: '3px solid #0053db',
                paddingLeft: 12, paddingTop: 4, paddingBottom: 4,
                background: '#f7f8fa', borderRadius: 2,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111', marginBottom: 4 }}>{c.taskTitle}</div>
                <div style={{ fontSize: 12, color: '#333', lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: sanitize(c.note) }}
                />
                <div style={{ fontSize: 10, color: '#777', fontFamily: 'ui-monospace, monospace', marginTop: 6 }}>
                  {c.authorName ?? 'System'} · {fmtDate(c.createdAt)} {fmtTime(c.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Month calendar snapshot — full task names per day */}
      <Section title={`Calendar Snapshot — ${monthLabel}`}>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f5f6f8' }}>
            {DAY_NAMES.map(n => (
              <div key={n} style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #e0e0e0', fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#666' }}>{n}</div>
            ))}
          </div>
          {/* Body — month grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gridTemplateRows: `repeat(${monthRowCount}, minmax(72px, auto))`,
          }}>
            {monthCells.map(d => {
              const parts = istParts(d)
              const monthParts = istParts(monthStart)
              const k = istDayKey(d)
              const today = istDayKey(new Date(report.date)) === k
              const inMonth = parts.m === monthParts.m && parts.y === monthParts.y
              const items = monthPerDay.get(k) ?? []
              return (
                <div key={k} style={{
                  borderLeft: '1px solid #f0f0f0',
                  borderTop: '1px solid #f0f0f0',
                  padding: 4,
                  background: today ? '#eaf3ff' : '#fff',
                  opacity: inMonth ? 1 : 0.4,
                  display: 'flex', flexDirection: 'column', gap: 3,
                  breakInside: 'avoid',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, monospace',
                      color: today ? '#0053db' : '#111',
                    }}>{parts.d}</span>
                    {items.length > 0 && (
                      <span style={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', color: '#777', background: '#f0f0f0', borderRadius: 2, padding: '0 3px' }}>{items.length}</span>
                    )}
                  </div>
                  {items.map(t => {
                    const color = STAGE_HEX[t.status] ?? STAGE_HEX.todo
                    return (
                      <div key={`${k}-${t.id}`} style={{
                        fontSize: 9, lineHeight: 1.3,
                        background: `${color}18`,
                        borderLeft: `2px solid ${color}`,
                        padding: '2px 4px', borderRadius: 2,
                        color: '#111', fontWeight: 600,
                        wordBreak: 'break-word',
                      }}
                      title={`${t.title} · ${t.status.replace('_', ' ')} · ${daysInclusive(t.startKey, t.endKey)}d`}
                      >{t.title}</div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {report.monthSnapshot.length === 0 && (
            <div style={{ padding: '18px 12px', fontSize: 11, color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
              Nothing scheduled this month.
            </div>
          )}
        </div>
      </Section>

      {/* Footer */}
      <div style={{ marginTop: 28, paddingTop: 14, borderTop: '1px solid #ddd', textAlign: 'center', fontSize: 9, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
        Generated by Kairos · Confidential · {fmtShortDate(new Date().toISOString())}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-brief { padding: 0 !important; max-width: none !important; }
          section { break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0', borderRadius: 4, padding: '10px 12px',
      background: '#fff',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 800, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent, fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 800, color: accent ?? '#111', letterSpacing: '0.12em',
        textTransform: 'uppercase', margin: '0 0 8px 0', paddingBottom: 4,
        borderBottom: `1px solid ${accent ?? '#111'}`,
      }}>{title}</h2>
      {children}
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p style={{ fontSize: 11, color: '#888', fontStyle: 'italic', margin: '4px 0' }}>{text}</p>
}

function TaskTable({ rows, highlightOverdue, anchorDate }: {
  rows: MemberReportTask[]
  highlightOverdue?: boolean
  anchorDate?: string
}) {
  const anchorMs = anchorDate ? new Date(anchorDate).getTime() : Date.now()
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ background: highlightOverdue ? '#fdecec' : '#f5f6f8', textAlign: 'left' }}>
          <Th>Task</Th>
          <Th width={90}>Stage</Th>
          <Th width={70}>Priority</Th>
          <Th width={highlightOverdue ? 170 : 140}>{highlightOverdue ? 'Was Due' : 'Schedule'}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(t => {
          const endIso = t.endDate ?? t.dueDate
          const daysLate = highlightOverdue && endIso
            ? Math.max(1, Math.round((anchorMs - new Date(endIso).getTime()) / 86_400_000))
            : 0
          return (
            <tr key={t.id} style={{ borderBottom: '1px solid #eee', background: highlightOverdue ? '#fff7f7' : 'transparent' }}>
              <Td>
                <div style={{ fontWeight: 600, color: '#111' }}>{t.title}</div>
                {t.projectTitle && <div style={{ fontSize: 10, color: '#777' }}>{t.projectTitle}</div>}
              </Td>
              <Td>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: 2,
                  background: `${STATUS_HEX[t.status] ?? '#a9b4b9'}20`,
                  color: STATUS_HEX[t.status] ?? '#555',
                }}>{STATUS_LABEL[t.status] ?? t.status}</span>
              </Td>
              <Td>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: PRIORITY_HEX[t.priority] ?? '#555',
                }}>● {t.priority}</span>
              </Td>
              <Td>
                <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: highlightOverdue ? '#c62828' : '#444' }}>
                  {fmtScheduleString(t)}
                  {highlightOverdue && daysLate > 0 && (
                    <span style={{ marginLeft: 6, fontWeight: 800 }}>· {daysLate}d late</span>
                  )}
                </span>
              </Td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function fmtScheduleString(t: MemberReportTask): string {
  const start = t.startDate ?? t.endDate ?? t.dueDate
  const end = t.endDate ?? t.dueDate ?? t.startDate
  if (!start && !end) return 'Unscheduled'
  if (!start || !end || start === end) return fmtShortDate(end ?? start!)
  return `${fmtShortDate(start)} → ${fmtShortDate(end)}`
}

function Th({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th style={{
      fontSize: 9, fontWeight: 800, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '6px 8px', borderBottom: '1px solid #e0e0e0', width,
    }}>{children}</th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px', verticalAlign: 'top' }}>{children}</td>
}

// Light sanitization for HTML comment content: keep tags Tiptap might emit,
// drop scripts/handlers. Defense-in-depth only — TaskComments stores HTML
// the user types so we don't want raw <script> rendering on the print page.
function sanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}
