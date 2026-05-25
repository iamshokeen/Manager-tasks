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

const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d',
  high: '#865400', medium: '#f8a010', low: '#a9b4b9',
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
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dayKey(iso: string): string { return iso.split('T')[0] }
function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString()
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

  // 7-day grid keys
  const weekDayKeys: string[] = []
  for (let i = 0; i < 7; i++) weekDayKeys.push(dayKey(addDaysISO(report.weekStart, i)))

  // Lane-pack week-snapshot bars (same algorithm as calendar, simplified).
  type Laid = { task: MemberReportWeekTask; lane: number; startIdx: number; endIdx: number }
  const sortedSnap = [...report.weekSnapshot].sort((a, b) =>
    a.startKey.localeCompare(b.startKey) || a.endKey.localeCompare(b.endKey))
  const lanes: number[] = []
  const laid: Laid[] = []
  for (const t of sortedSnap) {
    const startIdx = Math.max(0, weekDayKeys.indexOf(t.startKey))
    const endRaw = weekDayKeys.indexOf(t.endKey)
    const endIdx = endRaw === -1 ? 6 : Math.min(6, endRaw)
    let lane = lanes.findIndex(next => next <= startIdx)
    if (lane === -1) { lane = lanes.length; lanes.push(0) }
    lanes[lane] = endIdx + 1
    laid.push({ task: t, startIdx, endIdx, lane })
  }
  const laneCount = Math.max(1, lanes.length)

  const auto = sp.auto !== '0' // default = trigger print on load

  return (
    <div className="print-brief" style={{
      background: '#ffffff', color: '#111111', minHeight: '100vh',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      padding: '32px 40px', maxWidth: 920, margin: '0 auto',
    }}>
      {auto && <PrintAutoTrigger />}

      {/* No-print toolbar */}
      <div className="no-print" style={{
        display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
        marginBottom: 16,
      }}>
        <button
          onClick={() => { if (typeof window !== 'undefined') window.print() }}
          style={{
            padding: '8px 14px', borderRadius: 4, border: 'none',
            background: '#0053db', color: '#fff', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >Download PDF</button>
      </div>

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 22 }}>
        <StatTile label="Scheduled" value={report.counts.scheduledToday} accent="#0053db" />
        <StatTile label="In Progress" value={report.counts.inProgress} accent="#865400" />
        <StatTile label="Blocked" value={report.counts.blocked} accent="#c62828" />
        <StatTile label="Completed Today" value={report.counts.completedToday} accent="#2e7d32" />
        <StatTile label="Overdue" value={report.counts.overdue} accent={report.counts.overdue > 0 ? '#c62828' : '#a9b4b9'} />
      </div>

      {/* Today's tasks table */}
      <Section title="Today's Tasks">
        {report.todaysTasks.length === 0 ? (
          <EmptyLine text="No tasks scheduled for today." />
        ) : (
          <TaskTable rows={report.todaysTasks} />
        )}
      </Section>

      {/* In progress */}
      {report.inProgress.length > 0 && (
        <Section title={`In Progress (${report.inProgress.length})`}>
          <TaskTable rows={report.inProgress} />
        </Section>
      )}

      {/* Blocked */}
      {report.blocked.length > 0 && (
        <Section title={`Blocked (${report.blocked.length})`}>
          <TaskTable rows={report.blocked} />
        </Section>
      )}

      {/* Recent comments / progress notes */}
      <Section title={`Progress Notes from Comments (${report.recentComments.length})`}>
        {report.recentComments.length === 0 ? (
          <EmptyLine text="No comments in the last 7 days." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {report.recentComments.map(c => (
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

      {/* Completed today */}
      <Section title={`Completed Today (${report.completedToday.length})`}>
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

      {/* Week calendar snapshot */}
      <Section title="This Week's Calendar Snapshot">
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f5f6f8' }}>
            {weekDayKeys.map(k => {
              const d = new Date(k)
              const today = dayKey(report.date) === k
              return (
                <div key={k} style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                    color: today ? '#0053db' : '#666',
                  }}>{DAY_NAMES[d.getDay()]}</div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, fontFamily: 'ui-monospace, monospace',
                    color: today ? '#0053db' : '#111',
                  }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          {/* Body with bars */}
          <div style={{ position: 'relative', minHeight: Math.max(60, laneCount * 22 + 16) }}>
            {/* Column dividers */}
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', pointerEvents: 'none' }}>
              {weekDayKeys.map(k => <div key={k} style={{ borderRight: '1px solid #f0f0f0' }} />)}
            </div>
            {laid.length === 0 && (
              <div style={{ padding: '18px 12px', fontSize: 11, color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                Nothing scheduled this week.
              </div>
            )}
            {laid.map(({ task, startIdx, endIdx, lane }) => {
              const span = endIdx - startIdx + 1
              const color = PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.low
              return (
                <div
                  key={task.id}
                  style={{
                    position: 'absolute',
                    top: lane * 22 + 6, height: 18,
                    left: `calc(${(startIdx / 7) * 100}% + 4px)`,
                    width: `calc(${(span / 7) * 100}% - 8px)`,
                    background: `${color}20`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 2,
                    paddingLeft: 6, paddingRight: 4,
                    display: 'flex', alignItems: 'center',
                    fontSize: 10, fontWeight: 600, color: '#111',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}
                  title={`${task.title} · ${daysInclusive(task.startKey, task.endKey)}d`}
                >{task.title}</div>
              )
            })}
          </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 800, color: '#111', letterSpacing: '0.12em',
        textTransform: 'uppercase', margin: '0 0 8px 0', paddingBottom: 4, borderBottom: '1px solid #111',
      }}>{title}</h2>
      {children}
    </section>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p style={{ fontSize: 11, color: '#888', fontStyle: 'italic', margin: '4px 0' }}>{text}</p>
}

function TaskTable({ rows }: { rows: MemberReportTask[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
      <thead>
        <tr style={{ background: '#f5f6f8', textAlign: 'left' }}>
          <Th>Task</Th>
          <Th width={90}>Stage</Th>
          <Th width={70}>Priority</Th>
          <Th width={140}>Schedule</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(t => (
          <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
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
              <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: '#444' }}>
                {fmtScheduleString(t)}
              </span>
            </Td>
          </tr>
        ))}
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
