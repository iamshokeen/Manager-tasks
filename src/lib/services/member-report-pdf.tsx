// src/lib/services/member-report-pdf.tsx
//
// Render a MemberReport as a PDF Buffer using @react-pdf/renderer. Pure JS,
// no chromium dependency — runs cleanly in Vercel serverless functions.
//
// The visual language mirrors the on-screen print template (white paper,
// stage-colored chips) but uses react-pdf primitives (Document / Page /
// View / Text) since HTML isn't available in PDF land.

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type {
  MemberReport, MemberReportTask, MemberReportComment,
  MemberReportFollowUp, MemberReportWeekTask,
} from './member-report'
import { istParts, istMidnight, addIstDays, istDayKey } from '@/lib/ist-dates'

const STAGE_HEX: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}
const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d', high: '#865400',
  medium: '#f8a010', low: '#a9b4b9',
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function fmtIstDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}
function fmtIstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
function fmtSchedule(t: MemberReportTask): string {
  const start = t.startDate ?? t.endDate ?? t.dueDate
  const end = t.endDate ?? t.dueDate ?? t.startDate
  if (!start && !end) return '—'
  if (!start || !end || start === end) return fmtIstDate(end ?? start!)
  return `${fmtIstDate(start)} → ${fmtIstDate(end)}`
}
function daysInclusive(startKey: string, endKey: string): number {
  return Math.max(1, Math.round((new Date(endKey).getTime() - new Date(startKey).getTime()) / 86_400_000) + 1)
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 36, paddingVertical: 32, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 10, marginBottom: 14 },
  brand: { fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#0053db', textTransform: 'uppercase' },
  name: { fontSize: 22, fontWeight: 700, color: '#111', marginTop: 4 },
  sub: { fontSize: 9.5, color: '#555', marginTop: 2 },
  dateLine: { fontSize: 8, color: '#777', letterSpacing: 1, marginTop: 4, fontFamily: 'Courier' },

  statRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  statTile: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 3, padding: 6 },
  statLabel: { fontSize: 6.5, fontWeight: 700, color: '#666', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 16, fontWeight: 700, fontFamily: 'Courier', marginTop: 2 },

  sectionTitle: {
    fontSize: 8.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    borderBottomWidth: 1, paddingBottom: 3, marginTop: 12, marginBottom: 6,
  },
  emptyLine: { fontSize: 9, color: '#888', fontStyle: 'italic', marginVertical: 4 },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f6f8', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tableHeaderCell: { fontSize: 7, fontWeight: 700, color: '#555', letterSpacing: 1, textTransform: 'uppercase', paddingVertical: 4, paddingHorizontal: 5 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', minHeight: 22 },
  tableRowOverdue: { backgroundColor: '#fff7f7' },
  tableCell: { paddingVertical: 5, paddingHorizontal: 5 },
  taskTitle: { fontSize: 9.5, fontWeight: 700, color: '#111' },
  projectSub: { fontSize: 7.5, color: '#777', marginTop: 1 },

  chip: {
    fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8,
    textTransform: 'uppercase', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 1,
  },

  doneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  doneTitle: { fontSize: 9.5, color: '#333', textDecoration: 'line-through', flex: 1 },
  doneTime: { fontSize: 7.5, color: '#777', fontFamily: 'Courier' },

  comment: { borderLeftWidth: 3, borderLeftColor: '#0053db', backgroundColor: '#f7f8fa', padding: 6, marginBottom: 6, borderRadius: 2 },
  commentTask: { fontSize: 8, fontWeight: 700, color: '#111', marginBottom: 2 },
  commentBody: { fontSize: 9, color: '#333' },
  commentMeta: { fontSize: 7, color: '#777', fontFamily: 'Courier', marginTop: 4 },

  followRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  followTitle: { fontSize: 9.5, fontWeight: 700, color: '#111' },
  followSub: { fontSize: 8.5, color: '#777' },

  monthGrid: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden' },
  monthHeaderRow: { flexDirection: 'row', backgroundColor: '#f5f6f8' },
  monthHeaderCell: { flex: 1, paddingVertical: 3, textAlign: 'center', fontSize: 6.5, fontWeight: 700, letterSpacing: 1, color: '#666' },
  monthRow: { flexDirection: 'row', minHeight: 48 },
  monthCell: { flex: 1, borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#f0f0f0', padding: 2 },
  monthCellHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  monthDayNum: { fontSize: 7.5, fontWeight: 700, fontFamily: 'Courier', color: '#111' },
  monthCountBadge: { fontSize: 6, fontFamily: 'Courier', color: '#777', backgroundColor: '#f0f0f0', borderRadius: 1, paddingHorizontal: 2 },
  monthChip: {
    fontSize: 6.5, color: '#111', backgroundColor: '#e8eef9',
    paddingHorizontal: 2, paddingVertical: 1, borderRadius: 1,
    borderLeftWidth: 1.5, marginBottom: 1,
  },

  footer: { marginTop: 18, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ddd', textAlign: 'center',
    fontSize: 7, color: '#888', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Courier' },
})

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  )
}

function StageChip({ status }: { status: string }) {
  const color = STAGE_HEX[status] ?? '#a9b4b9'
  return (
    <Text style={[styles.chip, { color, backgroundColor: `${color}22` }]}>
      {status.replace('_', ' ')}
    </Text>
  )
}

function PriorityChip({ priority }: { priority: string }) {
  const color = PRIORITY_HEX[priority] ?? '#a9b4b9'
  return <Text style={[styles.chip, { color }]}>{`● ${priority}`}</Text>
}

function TaskTable({ rows, anchorDate, overdue }: {
  rows: MemberReportTask[]; anchorDate?: string; overdue?: boolean
}) {
  if (rows.length === 0) return <Text style={styles.emptyLine}>None.</Text>
  return (
    <View>
      <View style={[styles.tableHeader, overdue ? { backgroundColor: '#fdecec' } : {}]}>
        <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Task</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Stage</Text>
        <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Priority</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>{overdue ? 'Was Due' : 'Schedule'}</Text>
      </View>
      {rows.map(t => {
        const endIso = t.endDate ?? t.dueDate
        const daysLate = overdue && anchorDate && endIso
          ? Math.max(1, Math.round((new Date(anchorDate).getTime() - new Date(endIso).getTime()) / 86_400_000))
          : 0
        return (
          <View key={t.id} style={[styles.tableRow, overdue ? styles.tableRowOverdue : {}]} wrap={false}>
            <View style={[styles.tableCell, { flex: 2.5 }]}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              {t.projectTitle && <Text style={styles.projectSub}>{t.projectTitle}</Text>}
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <StageChip status={t.status} />
            </View>
            <View style={[styles.tableCell, { flex: 0.8 }]}>
              <PriorityChip priority={t.priority} />
            </View>
            <View style={[styles.tableCell, { flex: 1.4 }]}>
              <Text style={{ fontSize: 8, fontFamily: 'Courier', color: overdue ? '#c62828' : '#444' }}>
                {fmtSchedule(t)}
                {daysLate > 0 ? `  · ${daysLate}d late` : ''}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function DoneList({ items }: { items: MemberReportTask[] }) {
  if (items.length === 0) return <Text style={styles.emptyLine}>No tasks marked done today.</Text>
  return (
    <View>
      {items.map(t => (
        <View key={t.id} style={styles.doneRow} wrap={false}>
          <Text style={{ color: '#2e7d32', fontWeight: 700, marginRight: 6 }}>✓</Text>
          <Text style={styles.doneTitle}>{t.title}</Text>
          {t.completedAt && <Text style={styles.doneTime}>{fmtIstTime(t.completedAt)}</Text>}
        </View>
      ))}
    </View>
  )
}

function FollowUpList({ items }: { items: MemberReportFollowUp[] }) {
  if (items.length === 0) return <Text style={styles.emptyLine}>No follow-ups touched today.</Text>
  return (
    <View>
      {items.map(f => (
        <View key={f.id} style={styles.followRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={styles.followTitle}>{f.title}</Text>
            <Text style={styles.followSub}>{f.contactName}</Text>
          </View>
          <Text style={[styles.chip, { color: '#7c3aed' }]}>{f.status.toUpperCase()}</Text>
          <Text style={{ fontSize: 7.5, color: '#777', fontFamily: 'Courier', marginLeft: 8 }}>
            {fmtIstTime(f.lastActivityAt)}
          </Text>
        </View>
      ))}
    </View>
  )
}

function CommentsList({ items }: { items: MemberReportComment[] }) {
  if (items.length === 0) return <Text style={styles.emptyLine}>No comments posted today.</Text>
  return (
    <View>
      {items.map(c => (
        <View key={c.id} style={styles.comment} wrap={false}>
          <Text style={styles.commentTask}>{c.taskTitle}</Text>
          <Text style={styles.commentBody}>{stripHtml(c.note)}</Text>
          <Text style={styles.commentMeta}>
            {`${c.authorName ?? 'System'} · ${fmtIstTime(c.createdAt)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}

function MonthSnapshot({ report }: { report: MemberReport }) {
  const monthStart = new Date(report.monthStart)
  const monthEnd = new Date(report.monthEnd)
  const startParts = istParts(monthStart)
  const gridStart = istMidnight(startParts.y, startParts.m, startParts.d - startParts.dow)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addIstDays(gridStart, i))
  while (cells.length >= 35 && cells[cells.length - 7].getTime() > monthEnd.getTime()) cells.splice(cells.length - 7, 7)

  const perDay = new Map<string, MemberReportWeekTask[]>()
  for (const t of report.monthSnapshot) {
    for (const d of cells) {
      const k = istDayKey(d)
      if (k >= t.startKey && k <= t.endKey) {
        if (!perDay.has(k)) perDay.set(k, [])
        perDay.get(k)!.push(t)
      }
    }
  }

  // group rows of 7
  const rows: Date[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  const todayKey = istDayKey(new Date(report.date))
  const monthParts = istParts(monthStart)

  return (
    <View style={styles.monthGrid}>
      <View style={styles.monthHeaderRow}>
        {DAY_NAMES.map(n => <Text key={n} style={styles.monthHeaderCell}>{n}</Text>)}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.monthRow} wrap={false}>
          {row.map(d => {
            const parts = istParts(d)
            const k = istDayKey(d)
            const inMonth = parts.m === monthParts.m && parts.y === monthParts.y
            const today = k === todayKey
            const items = perDay.get(k) ?? []
            return (
              <View key={k} style={[
                styles.monthCell,
                { backgroundColor: today ? '#eaf3ff' : '#fff', opacity: inMonth ? 1 : 0.45 },
              ]}>
                <View style={styles.monthCellHeader}>
                  <Text style={[styles.monthDayNum, today ? { color: '#0053db' } : {}]}>
                    {parts.d}
                  </Text>
                  {items.length > 0 && <Text style={styles.monthCountBadge}>{items.length}</Text>}
                </View>
                {items.slice(0, 4).map(t => {
                  const color = STAGE_HEX[t.status] ?? STAGE_HEX.todo
                  return (
                    <Text key={`${k}-${t.id}`} style={[
                      styles.monthChip,
                      { borderLeftColor: color, backgroundColor: `${color}18` },
                    ]}>
                      {t.title.length > 22 ? t.title.slice(0, 21) + '…' : t.title}
                    </Text>
                  )
                })}
                {items.length > 4 && (
                  <Text style={{ fontSize: 6, color: '#777', fontFamily: 'Courier' }}>+{items.length - 4} more</Text>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  const c = color ?? '#111'
  return (
    <View wrap>
      <Text style={[styles.sectionTitle, { color: c, borderBottomColor: c }]}>{title}</Text>
      {children}
    </View>
  )
}

export function MemberReportDoc({ report }: { report: MemberReport }) {
  const monthLabel = new Date(report.monthStart).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
  const subtitle = [report.member.title, report.member.department].filter(Boolean).join(' · ') || report.member.email

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Kairos · Tactical Daily Brief</Text>
          <Text style={styles.name}>{report.member.name}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
          <Text style={styles.dateLine}>{`${fmtIstDate(report.date)} · IST`}</Text>
        </View>

        <View style={styles.statRow}>
          <StatTile label="In Progress" value={report.counts.inProgress} color="#865400" />
          <StatTile label="Overdue" value={report.counts.overdue} color={report.counts.overdue > 0 ? '#c62828' : '#a9b4b9'} />
          <StatTile label="Done Today" value={report.counts.completedToday} color="#2e7d32" />
          <StatTile label="Blocked" value={report.counts.blocked} color="#c62828" />
          <StatTile label="Follow-ups" value={report.counts.followUpsActionedToday} color="#7c3aed" />
          <StatTile label="New Today" value={report.counts.tasksCreatedToday} color="#0053db" />
        </View>

        <Section title={`In Progress (${report.inProgress.length})`} color="#865400">
          <TaskTable rows={report.inProgress} />
        </Section>

        <Section title={`Overdue (${report.overdue.length})`} color="#c62828">
          <TaskTable rows={report.overdue} overdue anchorDate={report.date} />
        </Section>

        <Section title={`Done Today (${report.completedToday.length})`} color="#2e7d32">
          <DoneList items={report.completedToday} />
        </Section>

        <Section title={`Blocked / In Review (${report.blocked.length})`} color="#c62828">
          <TaskTable rows={report.blocked} />
        </Section>

        <Section title={`Follow-ups Actioned Today (${report.followUpsActionedToday.length})`} color="#7c3aed">
          <FollowUpList items={report.followUpsActionedToday} />
        </Section>

        <Section title={`New Tasks Today (${report.tasksCreatedToday.length})`} color="#0053db">
          <TaskTable rows={report.tasksCreatedToday} />
        </Section>

        <Section title={`Upcoming This Month (${report.upcomingThisMonth.length})`} color="#0277bd">
          <TaskTable rows={report.upcomingThisMonth} />
        </Section>

        <Section title={`Comments Updated Today (${report.commentsToday.length})`}>
          <CommentsList items={report.commentsToday} />
        </Section>

        <Section title={`Calendar Snapshot — ${monthLabel}`}>
          <MonthSnapshot report={report} />
        </Section>

        <Text style={styles.footer}>Generated by Kairos · Confidential</Text>
      </Page>
    </Document>
  )
}

export async function renderMemberReportPdf(report: MemberReport): Promise<Buffer> {
  const stream = await pdf(<MemberReportDoc report={report} />).toBuffer()
  // toBuffer() on Node returns a NodeJS.ReadableStream; collect to Buffer.
  return await streamToBuffer(stream)
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
