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
  // Day 0 of the next month equals the last day of the current month.
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
  // We never schedule a run earlier than startDate, even if fromDate is older.
  let cursor = fromDate.getTime() < startDate.getTime() ? startOfDay(startDate) : startOfDay(fromDate)

  // Cap iteration so a misconfigured template can't cause an infinite loop.
  const HARD_CAP = 366 * 5

  if (frequency === 'daily') {
    // First valid: startDate + k * interval >= cursor.
    const baseMs = startOfDay(startDate).getTime()
    const cursorMs = cursor.getTime()
    const DAY = 86_400_000
    const elapsedDays = Math.max(0, Math.round((cursorMs - baseMs) / DAY))
    const k = Math.ceil(elapsedDays / interv)
    const candidate = addDays(startOfDay(startDate), k * interv)
    if (endDate && candidate.getTime() > startOfDay(endDate).getTime()) return null
    return candidate
  }

  if (frequency === 'weekly') {
    const allowed = daysOfWeek.length > 0 ? new Set(daysOfWeek) : new Set([startDate.getDay()])
    // We anchor on the week of startDate, increment by `interval` weeks.
    const weekAnchor = startOfDay(startDate)
    // Find ISO week-start (Sunday-based here) of weekAnchor and cursor.
    const weekMs = 7 * 86_400_000
    const anchorWeekStart = addDays(weekAnchor, -weekAnchor.getDay())
    let cursorWeekStart = addDays(startOfDay(cursor), -startOfDay(cursor).getDay())
    // Snap cursor week to nearest allowed week (every `interval` weeks from anchor).
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
  // Snap probe month to anchor + k * interval.
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
 * Generate one Task row per due template and roll the template forward.
 * Returns the IDs of generated tasks.
 */
export async function generateDueTasks(now: Date = new Date()): Promise<string[]> {
  const due = await prisma.recurringTaskTemplate.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  })

  const generated: string[] = []
  for (const t of due) {
    const runDate = t.nextRunAt ?? new Date()
    const dueDate = addDays(runDate, t.dueOffsetDays ?? 0)
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: t.description ?? undefined,
        priority: t.priority,
        department: t.department,
        status: 'todo',
        isSelfTask: t.isSelfTask,
        assigneeId: t.assigneeId ?? undefined,
        projectId: t.projectId ?? undefined,
        stakeholderId: t.stakeholderId ?? undefined,
        createdByUserId: t.createdByUserId ?? undefined,
        fromRecurringId: t.id,
        dueDate,
        source: 'recurring',
      },
    })
    generated.push(task.id)

    const next = computeNextRunAt(
      {
        frequency: t.frequency as Frequency,
        interval: t.interval,
        daysOfWeek: t.daysOfWeek,
        dayOfMonth: t.dayOfMonth,
        startDate: t.startDate,
        endDate: t.endDate,
      },
      addDays(runDate, 1),
    )

    await prisma.recurringTaskTemplate.update({
      where: { id: t.id },
      data: {
        lastGeneratedAt: runDate,
        nextRunAt: next,
        isActive: next !== null,
      },
    })
  }
  return generated
}

/**
 * On creation / patch, recompute the initial nextRunAt so the cron picks the
 * template up at the right time.
 */
export function initialNextRunAt(input: RecurrenceInput): Date | null {
  return computeNextRunAt(input, input.startDate)
}
