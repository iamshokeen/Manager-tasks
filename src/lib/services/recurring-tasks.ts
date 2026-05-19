// src/lib/services/recurring-tasks.ts
//
// Recurrence math + generation loop for RecurringTaskTemplate rows.
//
// `computeNextRunAt` is the single source of truth for cadence math; the
// route handlers and cron both call it. Kept pure so we can sanity-check it
// without touching the DB.
import { prisma } from '@/lib/prisma'

export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceInput {
  frequency: Frequency
  interval: number
  daysOfWeek: number[]   // 0..6, Sun..Sat
  dayOfMonth: number | null // 1..31, or -1 = last day
  startDate: Date
  endDate: Date | null
}

const DAY_MS = 86_400_000
const DEFAULT_HORIZON_DAYS = 365
const MAX_OCCURRENCES = 5000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

function lastDayOfMonth(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate()
}

/**
 * Given a recurrence definition and a date to count *from* (typically the
 * last successful run, or the start date if never run), return the next
 * occurrence at or after that date. Returns null when no further occurrence
 * exists before endDate.
 */
export function computeNextRunAt(input: RecurrenceInput, fromDate: Date): Date | null {
  const { frequency, interval, daysOfWeek, dayOfMonth, startDate, endDate } = input
  const interv = Math.max(1, Math.floor(interval))
  const cursor = fromDate.getTime() < startDate.getTime() ? startOfDay(startDate) : startOfDay(fromDate)
  const HARD_CAP = 366 * 5

  if (frequency === 'daily') {
    const baseMs = startOfDay(startDate).getTime()
    const cursorMs = cursor.getTime()
    const elapsedDays = Math.max(0, Math.round((cursorMs - baseMs) / DAY_MS))
    const k = Math.ceil(elapsedDays / interv)
    const candidate = addDays(startOfDay(startDate), k * interv)
    if (endDate && candidate.getTime() > startOfDay(endDate).getTime()) return null
    return candidate
  }

  if (frequency === 'weekly') {
    const allowed = daysOfWeek.length > 0 ? new Set(daysOfWeek) : new Set([startDate.getDay()])
    const weekAnchor = startOfDay(startDate)
    const weekMs = 7 * DAY_MS
    const anchorWeekStart = addDays(weekAnchor, -weekAnchor.getDay())
    let cursorWeekStart = addDays(startOfDay(cursor), -startOfDay(cursor).getDay())
    const weeksApart = Math.round((cursorWeekStart.getTime() - anchorWeekStart.getTime()) / weekMs)
    const weeksAhead = weeksApart % interv === 0 ? 0 : interv - (weeksApart % interv)
    cursorWeekStart = addDays(cursorWeekStart, weeksAhead)
    for (let i = 0; i < HARD_CAP; i++) {
      for (let dow = 0; dow < 7; dow++) {
        const cand = addDays(cursorWeekStart, dow)
        if (!allowed.has(cand.getDay())) continue
        if (cand.getTime() < cursor.getTime()) continue
        if (cand.getTime() < startOfDay(startDate).getTime()) continue
        if (endDate && cand.getTime() > startOfDay(endDate).getTime()) return null
        return cand
      }
      cursorWeekStart = addDays(cursorWeekStart, 7 * interv)
    }
    return null
  }

  // monthly
  const dom = dayOfMonth ?? startDate.getDate()
  const anchorMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  let probe = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const monthsApart = (probe.getFullYear() - anchorMonth.getFullYear()) * 12 + (probe.getMonth() - anchorMonth.getMonth())
  const monthsAhead = monthsApart % interv === 0 ? 0 : interv - (monthsApart % interv)
  probe = addMonths(probe, monthsAhead)
  for (let i = 0; i < HARD_CAP; i++) {
    const last = lastDayOfMonth(probe.getFullYear(), probe.getMonth())
    const day = dom === -1 ? last : Math.min(dom, last)
    const cand = new Date(probe.getFullYear(), probe.getMonth(), day)
    if (cand.getTime() >= cursor.getTime() && cand.getTime() >= startOfDay(startDate).getTime()) {
      if (endDate && cand.getTime() > startOfDay(endDate).getTime()) return null
      return cand
    }
    probe = addMonths(probe, interv)
  }
  return null
}

/**
 * Enumerate every occurrence in [startDate, horizon]. If endDate is set and
 * earlier than horizon, that wins. Caps at MAX_OCCURRENCES as a safety belt.
 */
export function computeOccurrences(input: RecurrenceInput, horizon: Date): Date[] {
  const stop = input.endDate && input.endDate.getTime() < horizon.getTime()
    ? startOfDay(input.endDate)
    : startOfDay(horizon)

  const out: Date[] = []
  let cursor = startOfDay(input.startDate)
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    const next = computeNextRunAt(input, cursor)
    if (!next) break
    if (next.getTime() > stop.getTime()) break
    out.push(next)
    cursor = addDays(next, 1)
  }
  return out
}

/**
 * Generate one Task row per due template and roll the template forward.
 * Kept for backwards compatibility. New code should call syncTemplateTasks.
 */
export async function generateDueTasks(now: Date = new Date()): Promise<string[]> {
  const templates = await prisma.recurringTaskTemplate.findMany({
    where: {
      isActive: true,
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    select: { id: true },
  })

  const generated: string[] = []
  for (const { id } of templates) {
    const result = await syncTemplateTasks(id, now)
    generated.push(...result.created)
  }
  return generated
}

/**
 * On creation / patch, recompute the initial nextRunAt so the cron picks the
 * template up at the right time. Kept for backwards compatibility.
 */
export function initialNextRunAt(input: RecurrenceInput): Date | null {
  return computeNextRunAt(input, input.startDate)
}

interface SyncResult {
  created: string[]
  updated: string[]
  deleted: string[]
}

/**
 * Materialize and sync all Task rows for a template within the horizon.
 *
 * Horizon = endDate (if set) OR now + DEFAULT_HORIZON_DAYS.
 *
 * Managed tasks (fromRecurringId=template.id, status=todo, dueDate>now) are
 * upserted to match the computed occurrence set. Touched tasks (status≠todo
 * or past) are left alone — they're "user-owned" now.
 */
export async function syncTemplateTasks(templateId: string, now: Date = new Date()): Promise<SyncResult> {
  const template = await prisma.recurringTaskTemplate.findUnique({ where: { id: templateId } })
  if (!template) return { created: [], updated: [], deleted: [] }

  const horizon = template.endDate ?? addDays(now, DEFAULT_HORIZON_DAYS)

  const occurrences = template.isActive
    ? computeOccurrences(
        {
          frequency: template.frequency as Frequency,
          interval: template.interval,
          daysOfWeek: template.daysOfWeek,
          dayOfMonth: template.dayOfMonth,
          startDate: template.startDate,
          endDate: template.endDate,
        },
        horizon,
      )
    : []

  // Managed task set: still actionable, scheduled in the future (relative to today).
  const existing = await prisma.task.findMany({
    where: {
      fromRecurringId: template.id,
      status: 'todo',
      dueDate: { gte: startOfDay(now) },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      department: true,
      assigneeId: true,
      isSelfTask: true,
      projectId: true,
      stakeholderId: true,
      dueDate: true,
    },
  })

  const offset = template.dueOffsetDays ?? 0
  const wantedDueDates = occurrences.map((d) => startOfDay(addDays(d, offset)))
  const wantedKeyed = new Map<number, Date>()
  for (const d of wantedDueDates) wantedKeyed.set(d.getTime(), d)

  const created: string[] = []
  const updated: string[] = []
  const deleted: string[] = []

  // 1. Update or delete existing managed tasks.
  for (const t of existing) {
    if (!t.dueDate) {
      // Managed task without a dueDate is anomalous; leave alone.
      continue
    }
    const key = startOfDay(t.dueDate).getTime()
    if (wantedKeyed.has(key)) {
      // Keep — but bring fields in line with the template if they drifted.
      const drift =
        t.title !== template.title ||
        (t.description ?? null) !== (template.description ?? null) ||
        t.priority !== template.priority ||
        t.department !== template.department ||
        (t.assigneeId ?? null) !== (template.assigneeId ?? null) ||
        t.isSelfTask !== template.isSelfTask ||
        (t.projectId ?? null) !== (template.projectId ?? null) ||
        (t.stakeholderId ?? null) !== (template.stakeholderId ?? null)
      if (drift) {
        await prisma.task.update({
          where: { id: t.id },
          data: {
            title: template.title,
            description: template.description,
            priority: template.priority,
            department: template.department,
            assigneeId: template.assigneeId,
            isSelfTask: template.isSelfTask,
            projectId: template.projectId,
            stakeholderId: template.stakeholderId,
          },
        })
        updated.push(t.id)
      }
      wantedKeyed.delete(key)
    } else {
      // Managed task whose dueDate no longer matches an occurrence — sync away.
      await prisma.task.delete({ where: { id: t.id } })
      deleted.push(t.id)
    }
  }

  // 2. Create tasks for any wanted dueDates not yet covered.
  for (const due of wantedKeyed.values()) {
    const task = await prisma.task.create({
      data: {
        title: template.title,
        description: template.description ?? undefined,
        priority: template.priority,
        department: template.department,
        status: 'todo',
        isSelfTask: template.isSelfTask,
        assigneeId: template.assigneeId ?? undefined,
        projectId: template.projectId ?? undefined,
        stakeholderId: template.stakeholderId ?? undefined,
        createdByUserId: template.createdByUserId ?? undefined,
        fromRecurringId: template.id,
        dueDate: due,
        source: 'recurring',
      },
    })
    created.push(task.id)
  }

  // 3. Roll template forward.
  const todayMs = startOfDay(now).getTime()
  const firstFuture = occurrences.find((d) => d.getTime() >= todayMs) ?? null
  const mostRecentPast = [...occurrences].reverse().find((d) => d.getTime() < todayMs) ?? null
  const hasAnyOccurrence = occurrences.length > 0
  await prisma.recurringTaskTemplate.update({
    where: { id: template.id },
    data: {
      lastGeneratedAt: mostRecentPast ?? template.lastGeneratedAt,
      nextRunAt: firstFuture,
      isActive: template.isActive && hasAnyOccurrence,
    },
  })

  return { created, updated, deleted }
}

/**
 * Delete all managed (future, still-todo) Task rows for a template. Called
 * before deleting the template itself; user-owned tasks survive (their
 * fromRecurringId becomes null via Prisma onDelete: SetNull).
 */
export async function deleteManagedTasks(templateId: string, now: Date = new Date()): Promise<number> {
  const res = await prisma.task.deleteMany({
    where: {
      fromRecurringId: templateId,
      status: 'todo',
      dueDate: { gte: startOfDay(now) },
    },
  })
  return res.count
}
