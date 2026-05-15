// src/app/api/recurring-tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { canManageUser, getVisibleUserIds, userIdFromTeamMember } from '@/lib/rbac'
import { initialNextRunAt, type Frequency } from '@/lib/services/recurring-tasks'

function parseDate(v: unknown): Date | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? undefined : d
}

async function canEditTemplate(
  user: { id: string; role?: string },
  template: { createdByUserId: string | null; assigneeId: string | null },
): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true
  if (template.createdByUserId === user.id) return true
  if (template.assigneeId) {
    const assigneeUserId = await userIdFromTeamMember(template.assigneeId)
    if (assigneeUserId && (await canManageUser(user.id, user.role ?? '', assigneeUserId))) return true
  }
  return false
}

async function checkVisibility(
  user: { id: string; role?: string },
  template: { createdByUserId: string | null; assigneeId: string | null },
): Promise<boolean> {
  if (user.role === 'SUPER_ADMIN') return true
  const visible = await getVisibleUserIds(user.id, user.role ?? '')
  if (template.createdByUserId && visible.has(template.createdByUserId)) return true
  if (template.assigneeId) {
    const assigneeUserId = await userIdFromTeamMember(template.assigneeId)
    if (assigneeUserId && visible.has(assigneeUserId)) return true
  }
  return false
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }
  const { id } = await params
  const template = await prisma.recurringTaskTemplate.findUnique({ where: { id } })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await checkVisibility(user, template))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: template })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }
  const { id } = await params
  const existing = await prisma.recurringTaskTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await canEditTemplate(user, existing))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const startDate = parseDate(body.startDate)
    const endDate = parseDate(body.endDate)

    const recurrence = {
      frequency: (body.frequency ?? existing.frequency) as Frequency,
      interval: Math.max(1, Number(body.interval ?? existing.interval)),
      daysOfWeek: Array.isArray(body.daysOfWeek)
        ? body.daysOfWeek.map((n: unknown) => Number(n)).filter((n: number) => n >= 0 && n <= 6)
        : existing.daysOfWeek,
      dayOfMonth:
        body.dayOfMonth === undefined ? existing.dayOfMonth :
        body.dayOfMonth === null ? null : Number(body.dayOfMonth),
      startDate: startDate ?? existing.startDate,
      endDate: endDate === undefined ? existing.endDate : endDate,
    }

    const next = initialNextRunAt(recurrence)

    const template = await prisma.recurringTaskTemplate.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        description: body.description === undefined ? undefined : (body.description ? String(body.description) : null),
        priority: body.priority ?? undefined,
        department: body.department ?? undefined,
        assigneeId: body.assigneeId === undefined ? undefined : (body.assigneeId ?? null),
        isSelfTask: body.isSelfTask === undefined ? undefined : !!body.isSelfTask,
        projectId: body.projectId === undefined ? undefined : (body.projectId ?? null),
        stakeholderId: body.stakeholderId === undefined ? undefined : (body.stakeholderId ?? null),
        frequency: recurrence.frequency,
        interval: recurrence.interval,
        daysOfWeek: recurrence.daysOfWeek,
        dayOfMonth: recurrence.dayOfMonth,
        dueOffsetDays: body.dueOffsetDays === undefined ? undefined : Number(body.dueOffsetDays),
        startDate: recurrence.startDate,
        endDate: recurrence.endDate,
        nextRunAt: next,
        isActive: body.isActive === undefined ? next !== null : !!body.isActive,
      },
    })
    return NextResponse.json({ data: template })
  } catch {
    return NextResponse.json({ error: 'Failed to update recurring task' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string }
  const { id } = await params
  const existing = await prisma.recurringTaskTemplate.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await canEditTemplate(user, existing))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.recurringTaskTemplate.delete({ where: { id } })
  return NextResponse.json({ message: 'Deleted' })
}
