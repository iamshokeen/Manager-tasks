// src/app/api/recurring-tasks/route.ts
//
// CRUD-ish endpoints for RecurringTaskTemplate.
// Visibility: SA sees all, others see templates they created OR templates
// whose assignee.user sits in their manager chain.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { canRoleAsync, getVisibleUserIds } from '@/lib/rbac'
import { initialNextRunAt, type Frequency } from '@/lib/services/recurring-tasks'

function parseDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  let where = {}
  if (user.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(user.id, user.role ?? '')
    const ids = Array.from(visible)
    where = {
      OR: [
        { createdByUserId: { in: ids } },
        { assignee: { user: { id: { in: ids } } } },
      ],
    }
  }

  try {
    const templates = await prisma.recurringTaskTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, title: true } },
        stakeholder: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ data: templates })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch recurring tasks' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }

  // Same gate as tasks creation — Guests/Exec can't create either.
  if (!(await canRoleAsync(user.role ?? '', 'tasks', 'create'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (!body.title || !body.department || !body.frequency || !body.startDate) {
      return NextResponse.json({ error: 'title, department, frequency, startDate are required' }, { status: 400 })
    }
    if (!['daily', 'weekly', 'monthly'].includes(body.frequency)) {
      return NextResponse.json({ error: 'frequency must be daily | weekly | monthly' }, { status: 400 })
    }
    const startDate = parseDate(body.startDate)
    if (!startDate) return NextResponse.json({ error: 'startDate invalid' }, { status: 400 })
    const endDate = parseDate(body.endDate)

    const recurrence = {
      frequency: body.frequency as Frequency,
      interval: Math.max(1, Number(body.interval ?? 1)),
      daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek.map((n: unknown) => Number(n)).filter((n: number) => n >= 0 && n <= 6) : [],
      dayOfMonth: body.dayOfMonth === undefined || body.dayOfMonth === null ? null : Number(body.dayOfMonth),
      startDate,
      endDate,
    }

    const nextRunAt = initialNextRunAt(recurrence)

    const template = await prisma.recurringTaskTemplate.create({
      data: {
        title: String(body.title).trim(),
        description: body.description ? String(body.description) : null,
        priority: body.priority ?? 'medium',
        department: String(body.department),
        assigneeId: body.assigneeId ?? null,
        isSelfTask: !!body.isSelfTask,
        projectId: body.projectId ?? null,
        stakeholderId: body.stakeholderId ?? null,
        createdByUserId: user.id,
        frequency: recurrence.frequency,
        interval: recurrence.interval,
        daysOfWeek: recurrence.daysOfWeek,
        dayOfMonth: recurrence.dayOfMonth,
        dueOffsetDays: Number(body.dueOffsetDays ?? 0),
        startDate,
        endDate,
        nextRunAt,
        isActive: nextRunAt !== null,
      },
    })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create recurring task' }, { status: 500 })
  }
}
