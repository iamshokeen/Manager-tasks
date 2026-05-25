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

export interface MemberReportFollowUp {
  id: string
  title: string
  contactName: string
  status: string
  lastActivityAt: string
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
    followUpsActionedToday: number
    tasksCreatedToday: number
  }
  todaysTasks: MemberReportTask[]
  completedToday: MemberReportTask[]
  inProgress: MemberReportTask[]
  blocked: MemberReportTask[]
  overdue: MemberReportTask[]
  /** Tasks created on the anchor day. */
  tasksCreatedToday: MemberReportTask[]
  /** Follow-ups whose lastActivityAt falls on the anchor day. */
  followUpsActionedToday: MemberReportFollowUp[]
  /** Task-activity comments authored on the anchor day. */
  commentsToday: MemberReportComment[]
  /** @deprecated kept for backward-compat with prior payload consumers. */
  recentComments: MemberReportComment[]
  weekSnapshot: MemberReportWeekTask[]
  /** Tasks intersecting the calendar month containing the anchor date. */
  monthSnapshot: MemberReportWeekTask[]
}

// Shared IST helpers — see src/lib/ist-dates.ts for the rationale.
import { istDayBounds, istWeekBounds, istMonthBounds, istDayKey } from '@/lib/ist-dates'

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

  const { start: dayStart, end: dayEnd } = istDayBounds(anchor)
  const { start: weekStart, end: weekEnd } = istWeekBounds(anchor)
  const { start: monthStart, end: monthEnd } = istMonthBounds(anchor)

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
  // Backward-compat: legacy 'done' tasks have completedAt = null because we
  // only started writing it on 2026-05-25. Fall back to updatedAt for those
  // so a task marked done before the fix still appears in today's brief.
  const completedToday = await prisma.task.findMany({
    where: {
      AND: [
        { OR: orClauses },
        { status: 'done' },
        {
          OR: [
            { completedAt: { gte: dayStart, lte: dayEnd } },
            { AND: [{ completedAt: null }, { updatedAt: { gte: dayStart, lte: dayEnd } }] },
          ],
        },
      ],
    },
    include: { project: { select: { title: true } } },
    orderBy: [{ completedAt: 'desc' }, { updatedAt: 'desc' }],
  })

  // 3) Active in-progress tasks (snapshot, not date-bounded).
  const inProgress = await prisma.task.findMany({
    where: { OR: orClauses, status: 'in_progress' },
    include: { project: { select: { title: true } } },
    orderBy: { dueDate: 'asc' },
  })

  // 4) Blocked / In Review tasks — anything waiting on someone else.
  // 'review' is bucketed with 'blocked' in the brief so the manager sees a
  // single "needs attention from another party" pile.
  const blocked = await prisma.task.findMany({
    where: { OR: orClauses, status: { in: ['blocked', 'review'] } },
    include: { project: { select: { title: true } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
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

  // 6) Comments on their tasks — scoped strictly to the anchor day.
  const myTaskIds = await prisma.task.findMany({
    where: { OR: orClauses },
    select: { id: true, title: true },
  })
  const idToTitle = new Map(myTaskIds.map(t => [t.id, t.title]))
  const comments = await prisma.taskActivity.findMany({
    where: {
      taskId: { in: myTaskIds.map(t => t.id) },
      type: 'comment',
      createdAt: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 6a) Tasks created on the anchor day, owned by this user. Excludes
  // recurring-spawned rows (source='recurring' / fromRecurringId set):
  // the cron materializes hundreds of future occurrences with
  // createdAt=now, which would otherwise drown out the handful of tasks
  // a human actually drafted today.
  const tasksCreatedToday = await prisma.task.findMany({
    where: {
      AND: [
        { OR: orClauses },
        { createdAt: { gte: dayStart, lte: dayEnd } },
        { source: { not: 'recurring' } },
        { fromRecurringId: null },
      ],
    },
    include: { project: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // 6b) Follow-ups touched on the anchor day. Owner = creator OR linked
  // teamMember matches this user's TeamMember row.
  const followUpOr: import('@prisma/client').Prisma.FollowUpWhereInput[] = [
    { createdByUserId: userId },
  ]
  if (teamMemberId) followUpOr.push({ teamMemberId })
  const followUpsActioned = await prisma.followUp.findMany({
    where: {
      AND: [
        { OR: followUpOr },
        { lastActivityAt: { gte: dayStart, lte: dayEnd } },
      ],
    },
    select: { id: true, title: true, contactName: true, status: true, lastActivityAt: true },
    orderBy: { lastActivityAt: 'desc' },
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
      startKey: s ? istDayKey(s) : istDayKey(weekStart),
      endKey: e ? istDayKey(e) : istDayKey(weekStart),
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
      startKey: s ? istDayKey(s) : istDayKey(monthStart),
      endKey: e ? istDayKey(e) : istDayKey(monthStart),
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
      followUpsActionedToday: followUpsActioned.length,
      tasksCreatedToday: tasksCreatedToday.length,
    },
    todaysTasks: todaysTasks.map(pick),
    completedToday: completedToday.map(pick),
    inProgress: inProgress.map(pick),
    blocked: blocked.map(pick),
    overdue: overdue.map(pick),
    tasksCreatedToday: tasksCreatedToday.map(pick),
    followUpsActionedToday: followUpsActioned.map(f => ({
      id: f.id,
      title: f.title,
      contactName: f.contactName,
      status: f.status,
      lastActivityAt: f.lastActivityAt.toISOString(),
    })),
    commentsToday: comments.map(c => ({
      id: c.id,
      taskId: c.taskId,
      taskTitle: idToTitle.get(c.taskId) ?? 'Task',
      note: c.note ?? '',
      authorName: c.authorName,
      createdAt: c.createdAt.toISOString(),
    })),
    // Back-compat alias — same payload as commentsToday for older consumers.
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
