// src/lib/services/member-report.ts
//
// Per-member daily brief aggregator.
//
// Given a user id and an anchor date (defaults to today), returns everything
// needed to render that person's daily tactical brief — counts, today's
// tasks bucketed by stage, recent comments from their tasks, completed
// today, and a 7-day calendar snapshot of their tasks.
//
// Used by:
//   • /api/reports/member/[userId]          → JSON payload for previews
//   • /reports/print/[userId]               → server-rendered printable brief
//

import { prisma } from '@/lib/prisma'

export interface MemberReportTask {
  id: string
  title: string
  status: string
  priority: string
  department: string | null
  startDate: string | null
  endDate: string | null
  dueDate: string | null
  completedAt: string | null
  projectTitle: string | null
}

export interface MemberReportComment {
  id: string
  taskId: string
  taskTitle: string
  note: string
  authorName: string | null
  createdAt: string
}

export interface MemberReportWeekTask {
  id: string
  title: string
  priority: string
  status: string
  startKey: string // 'YYYY-MM-DD'
  endKey: string   // 'YYYY-MM-DD'
}

export interface MemberReport {
  member: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
    teamMemberId: string | null
    department: string | null
    title: string | null
  }
  date: string                  // ISO of anchor day
  weekStart: string             // ISO of week start (Sun)
  weekEnd: string               // ISO of week end (Sat)
  monthStart: string            // ISO of first day of anchor's month
  monthEnd: string              // ISO of last day of anchor's month
  counts: {
    scheduledToday: number
    inProgress: number
    blocked: number
    completedToday: number
    overdue: number
  }
  todaysTasks: MemberReportTask[]
  completedToday: MemberReportTask[]
  inProgress: MemberReportTask[]
  blocked: MemberReportTask[]
  overdue: MemberReportTask[]
  recentComments: MemberReportComment[]
  weekSnapshot: MemberReportWeekTask[]
  /** Tasks intersecting the calendar month containing the anchor date. */
  monthSnapshot: MemberReportWeekTask[]
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function startOfWeek(d: Date): Date { const x = startOfDay(d); return addDays(x, -x.getDay()) }
function toKey(d: Date): string { return new Date(d).toISOString().split('T')[0] }

function pick(t: {
  id: string; title: string; status: string; priority: string; department: string;
  startDate: Date | null; endDate: Date | null; dueDate: Date | null; completedAt: Date | null;
  project?: { title: string } | null;
}): MemberReportTask {
  return {
    id: t.id, title: t.title, status: t.status, priority: t.priority, department: t.department,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    projectTitle: t.project?.title ?? null,
  }
}

export async function getMemberReport(userId: string, anchor: Date = new Date()): Promise<MemberReport | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, avatarUrl: true,
      teamMemberId: true,
      teamMember: { select: { id: true, role: true, department: true } },
    },
  })
  if (!user) return null

  const dayStart = startOfDay(anchor)
  const dayEnd = endOfDay(anchor)
  const weekStart = startOfWeek(anchor)
  const weekEnd = endOfDay(addDays(weekStart, 6))
  const monthStart = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
  const monthEnd = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))

  // Resolve "their tasks" = tasks they created OR are assigned to (via TeamMember).
  const teamMemberId = user.teamMemberId

  const orClauses: import('@prisma/client').Prisma.TaskWhereInput[] = [
    { createdByUserId: userId },
  ]
  if (teamMemberId) orClauses.push({ assigneeId: teamMemberId })

  // 1) Today's scheduled tasks (start/end/due overlaps today).
  const todaysTasks = await prisma.task.findMany({
    where: {
      OR: orClauses,
      AND: [{
        OR: [
          { AND: [{ startDate: { lte: dayEnd } }, { endDate: { gte: dayStart } }] },
          { AND: [{ startDate: null }, { endDate: null }, { dueDate: { gte: dayStart, lte: dayEnd } }] },
        ],
      }],
    },
    include: { project: { select: { title: true } } },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
  })

  // 2) Completed today.
  const completedToday = await prisma.task.findMany({
    where: {
      OR: orClauses,
      status: 'done',
      completedAt: { gte: dayStart, lte: dayEnd },
    },
    include: { project: { select: { title: true } } },
    orderBy: { completedAt: 'desc' },
  })

  // 3) Active in-progress tasks (snapshot, not date-bounded).
  const inProgress = await prisma.task.findMany({
    where: { OR: orClauses, status: 'in_progress' },
    include: { project: { select: { title: true } } },
    orderBy: { dueDate: 'asc' },
  })

  // 4) Blocked tasks.
  const blocked = await prisma.task.findMany({
    where: { OR: orClauses, status: 'blocked' },
    include: { project: { select: { title: true } } },
    orderBy: { dueDate: 'asc' },
  })

  // 5) Overdue tasks (open tasks with end/due before today).
  const overdue = await prisma.task.findMany({
    where: {
      AND: [
        { OR: orClauses },
        { status: { not: 'done' } },
        {
          OR: [
            { endDate: { lt: dayStart } },
            { AND: [{ endDate: null }, { dueDate: { lt: dayStart } }] },
          ],
        },
      ],
    },
    include: { project: { select: { title: true } } },
    // Most overdue first (oldest end/due bubbles up).
    orderBy: [{ endDate: 'asc' }, { dueDate: 'asc' }],
  })

  // 6) Recent comments on their tasks (last 7 days, max 10).
  const sevenAgo = addDays(dayStart, -7)
  const myTaskIds = await prisma.task.findMany({
    where: { OR: orClauses },
    select: { id: true, title: true },
  })
  const idToTitle = new Map(myTaskIds.map(t => [t.id, t.title]))
  const comments = await prisma.taskActivity.findMany({
    where: {
      taskId: { in: myTaskIds.map(t => t.id) },
      type: 'comment',
      createdAt: { gte: sevenAgo, lte: dayEnd },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // 7) Week snapshot tasks (anything intersecting the week).
  const weekTasks = await prisma.task.findMany({
    where: {
      OR: orClauses,
      AND: [{
        OR: [
          { AND: [{ startDate: { lte: weekEnd } }, { endDate: { gte: weekStart } }] },
          { AND: [{ startDate: null }, { endDate: null }, { dueDate: { gte: weekStart, lte: weekEnd } }] },
        ],
      }],
    },
    select: { id: true, title: true, priority: true, status: true, startDate: true, endDate: true, dueDate: true },
  })

  const weekSnapshot: MemberReportWeekTask[] = weekTasks.map(t => {
    const s = t.startDate ?? t.endDate ?? t.dueDate
    const e = t.endDate ?? t.dueDate ?? t.startDate
    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      startKey: s ? toKey(s) : toKey(weekStart),
      endKey: e ? toKey(e) : toKey(weekStart),
    }
  })

  // 8) Month snapshot tasks (anything intersecting the calendar month).
  const monthTasks = await prisma.task.findMany({
    where: {
      OR: orClauses,
      AND: [{
        OR: [
          { AND: [{ startDate: { lte: monthEnd } }, { endDate: { gte: monthStart } }] },
          { AND: [{ startDate: null }, { endDate: null }, { dueDate: { gte: monthStart, lte: monthEnd } }] },
        ],
      }],
    },
    select: { id: true, title: true, priority: true, status: true, startDate: true, endDate: true, dueDate: true },
  })

  const monthSnapshot: MemberReportWeekTask[] = monthTasks.map(t => {
    const s = t.startDate ?? t.endDate ?? t.dueDate
    const e = t.endDate ?? t.dueDate ?? t.startDate
    return {
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      startKey: s ? toKey(s) : toKey(monthStart),
      endKey: e ? toKey(e) : toKey(monthStart),
    }
  })

  return {
    member: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      teamMemberId: user.teamMemberId,
      department: user.teamMember?.department ?? null,
      title: user.teamMember?.role ?? null,
    },
    date: dayStart.toISOString(),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    counts: {
      scheduledToday: todaysTasks.length,
      inProgress: inProgress.length,
      blocked: blocked.length,
      completedToday: completedToday.length,
      overdue: overdue.length,
    },
    todaysTasks: todaysTasks.map(pick),
    completedToday: completedToday.map(pick),
    inProgress: inProgress.map(pick),
    blocked: blocked.map(pick),
    overdue: overdue.map(pick),
    recentComments: comments.map(c => ({
      id: c.id,
      taskId: c.taskId,
      taskTitle: idToTitle.get(c.taskId) ?? 'Task',
      note: c.note ?? '',
      authorName: c.authorName,
      createdAt: c.createdAt.toISOString(),
    })),
    weekSnapshot,
    monthSnapshot,
  }
}
