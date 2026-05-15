// src/lib/services/tasks.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { TaskFilters, ActivityType } from '@/types'

// Priority sort: explicit order rather than lexical.
// 'urgent'/'critical' > 'high' > 'medium' > 'low'
function priorityOrderCase(direction: 'asc' | 'desc') {
  // We can't ORDER BY a CASE expression directly through Prisma's typed
  // orderBy, so callers fall back to in-memory sort when sortBy is priority.
  return direction
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function startOfWeek(): Date {
  const d = startOfToday()
  const day = d.getDay() // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d
}

function startOfMonth(): Date {
  const d = startOfToday()
  d.setDate(1)
  return d
}

export async function getTasks(filters: TaskFilters = {}) {
  const where: Prisma.TaskWhereInput = {}
  const ands: Prisma.TaskWhereInput[] = []

  if (filters.assigneeId) where.assigneeId = filters.assigneeId
  if (filters.department) where.department = filters.department
  if (filters.status) where.status = filters.status
  if (filters.priority) where.priority = filters.priority
  if (filters.isSelfTask !== undefined) where.isSelfTask = filters.isSelfTask
  if (filters.projectId) where.projectId = filters.projectId
  if (filters.stakeholderId) where.stakeholderId = filters.stakeholderId
  if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (filters.assignedByName) (where as any).assignedByName = filters.assignedByName

  // Multi-select filters (Spec B). Each adds an `IN` clause when populated.
  if (filters.priorityIn?.length) ands.push({ priority: { in: filters.priorityIn } })
  if (filters.departmentIn?.length) ands.push({ department: { in: filters.departmentIn } })
  if (filters.assigneeIdIn?.length) {
    const ids = filters.assigneeIdIn.filter((x) => x !== '__unassigned__')
    const includeUnassigned = filters.assigneeIdIn.includes('__unassigned__')
    const inOr: Prisma.TaskWhereInput[] = []
    if (ids.length) inOr.push({ assigneeId: { in: ids } })
    if (includeUnassigned) inOr.push({ assigneeId: null })
    if (inOr.length) ands.push({ OR: inOr })
  }
  if (filters.assignedByNameIn?.length) {
    ands.push({ assignedByName: { in: filters.assignedByNameIn } })
  }
  if (filters.stakeholderIdIn?.length) {
    ands.push({
      OR: [
        { stakeholderId: { in: filters.stakeholderIdIn } },
        { stakeholders: { some: { stakeholderId: { in: filters.stakeholderIdIn } } } },
      ],
    })
  }

  // Due-date windows
  switch (filters.dueWindow) {
    case 'overdue':
      ands.push({ dueDate: { lt: startOfToday() }, status: { not: 'done' } })
      break
    case 'today':
      ands.push({ dueDate: { gte: startOfToday(), lte: endOfToday() } })
      break
    case 'week':
      ands.push({ dueDate: { gte: startOfWeek() } })
      break
    case 'month':
      ands.push({ dueDate: { gte: startOfMonth() } })
      break
    case 'none':
      ands.push({ dueDate: null })
      break
  }

  switch (filters.createdWindow) {
    case 'today':
      ands.push({ createdAt: { gte: startOfToday() } })
      break
    case 'week':
      ands.push({ createdAt: { gte: startOfWeek() } })
      break
    case 'month':
      ands.push({ createdAt: { gte: startOfMonth() } })
      break
  }

  // Chain visibility (2026-05-14 spec). When `visibleUserIds` is present,
  // only tasks created by — or assigned to a TeamMember linked to — one of
  // those users are returned. SA bypasses by not setting visibleUserIds.
  if (filters.visibleUserIds) {
    const ids = filters.visibleUserIds
    if (ids.length === 0) {
      // No-op visibility: empty result set.
      ands.push({ id: 'NO_VISIBLE_TASKS_FOR_USER' })
    } else {
      ands.push({
        OR: [
          { createdByUserId: { in: ids } },
          { assignee: { user: { id: { in: ids } } } },
        ],
      })
    }
  } else if (filters.ownershipFilter) {
    // Legacy fallback when chain visibility isn't supplied.
    const { userId, teamMemberId } = filters.ownershipFilter
    const orClauses: Prisma.TaskWhereInput[] = [{ createdByUserId: userId }]
    if (teamMemberId) orClauses.push({ assigneeId: teamMemberId })
    ands.push({ OR: orClauses })
  } else if (filters.contributorFilter) {
    const { teamMemberId, name } = filters.contributorFilter
    const orClauses: Prisma.TaskWhereInput[] = [{ assignedByName: name }]
    if (teamMemberId) orClauses.push({ assigneeId: teamMemberId })
    ands.push({ OR: orClauses })
  }

  if (ands.length) where.AND = ands

  // Pick an order. Priority sort needs in-memory pass; others SQL-native.
  let orderBy: Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[] = [
    { priority: 'asc' },
    { dueDate: 'asc' },
    { createdAt: 'desc' },
  ]
  let postSort: ((rows: Array<{ priority: string }>) => Array<{ priority: string }>) | null = null
  switch (filters.sortBy) {
    case 'due_asc':
      orderBy = [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
      break
    case 'due_desc':
      orderBy = [{ dueDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
      break
    case 'created_desc':
      orderBy = { createdAt: 'desc' }
      break
    case 'created_asc':
      orderBy = { createdAt: 'asc' }
      break
    case 'title_asc':
      orderBy = { title: 'asc' }
      break
    case 'title_desc':
      orderBy = { title: 'desc' }
      break
    case 'priority_desc':
    case 'priority_asc': {
      const direction = filters.sortBy === 'priority_desc' ? 'desc' : 'asc'
      orderBy = { dueDate: { sort: 'asc', nulls: 'last' } }
      const rank: Record<string, number> = { urgent: 4, critical: 4, high: 3, medium: 2, low: 1 }
      postSort = (rows) =>
        [...rows].sort((a, b) => {
          const ra = rank[a.priority] ?? 0
          const rb = rank[b.priority] ?? 0
          return direction === 'desc' ? rb - ra : ra - rb
        })
      // Keep type relaxed
      priorityOrderCase(direction)
      break
    }
  }

  const rows = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, department: true } },
      project: { select: { id: true, title: true, stage: true } },
      stakeholder: { select: { id: true, name: true } },
      stakeholders: { include: { stakeholder: { select: { id: true, name: true } } } },
      _count: { select: { activities: true } },
    },
    orderBy,
  })

  return postSort ? (postSort(rows as unknown as Array<{ priority: string }>) as unknown as typeof rows) : rows
}

export async function getTask(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      assignee: true,
      project: true,
      stakeholder: true,
      stakeholders: { include: { stakeholder: { select: { id: true, name: true, title: true } } } },
      activities: { orderBy: { createdAt: 'desc' } },
      emailThreads: { include: { emailThread: true } },
    },
  })
}

export async function createTask(
  data: Prisma.TaskCreateInput & { stakeholderIds?: string[] }
) {
  const { stakeholderIds, ...rest } = data as Record<string, unknown> & { stakeholderIds?: string[] }
  const taskData = rest as Prisma.TaskCreateInput

  const task = await prisma.task.create({ data: taskData })

  if (stakeholderIds && stakeholderIds.length > 0) {
    await prisma.taskStakeholder.createMany({
      data: stakeholderIds.map(sId => ({ taskId: task.id, stakeholderId: sId })),
      skipDuplicates: true,
    })
  }

  return task
}

export async function updateTask(
  id: string,
  data: Prisma.TaskUpdateInput & { stakeholderIds?: string[]; _note?: string },
  actorNote?: string
) {
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) throw new Error('Task not found')

  // Extract non-Prisma fields before update
  const { stakeholderIds, _note, ...taskData } = data as Record<string, unknown> & {
    stakeholderIds?: string[]
    _note?: string
  }

  const task = await prisma.task.update({ where: { id }, data: taskData as Prisma.TaskUpdateInput })

  // Sync stakeholders if provided
  if (stakeholderIds !== undefined) {
    await prisma.taskStakeholder.deleteMany({ where: { taskId: id } })
    if (stakeholderIds.length > 0) {
      await prisma.taskStakeholder.createMany({
        data: stakeholderIds.map(sId => ({ taskId: id, stakeholderId: sId })),
        skipDuplicates: true,
      })
    }
  }

  // Log status change
  if (taskData.status && taskData.status !== existing.status) {
    await logActivity(id, 'status_change', existing.status, taskData.status as string)
    if (taskData.status === 'done') {
      await logActivity(id, 'completion', undefined, undefined, actorNote ?? (_note as string | undefined))
    }
  }

  // Log assignment change
  if ('assigneeId' in taskData && taskData.assigneeId !== existing.assigneeId) {
    await logActivity(id, 'assignment', existing.assigneeId ?? undefined, taskData.assigneeId as string ?? undefined)
  }

  // Log simple string field edits
  const stringFields: Array<{ key: string; dataKey: keyof Prisma.TaskUpdateInput }> = [
    { key: 'title', dataKey: 'title' },
    { key: 'description', dataKey: 'description' },
    { key: 'priority', dataKey: 'priority' },
  ]
  for (const { key, dataKey } of stringFields) {
    if (dataKey in taskData && taskData[dataKey] !== undefined && String(taskData[dataKey]) !== String(existing[key as keyof typeof existing])) {
      await logActivity(id, 'edit', key, String(taskData[dataKey]))
    }
  }

  // Log dueDate change
  if ('dueDate' in taskData && taskData.dueDate !== undefined) {
    const newDate = taskData.dueDate ? new Date(taskData.dueDate as string).toISOString() : null
    const oldDate = existing.dueDate ? existing.dueDate.toISOString() : null
    if (newDate !== oldDate) {
      await logActivity(id, 'edit', 'dueDate', newDate ?? 'cleared')
    }
  }

  // Log tags change
  if ('tags' in taskData && Array.isArray(taskData.tags)) {
    const newTags = JSON.stringify(taskData.tags)
    const oldTags = JSON.stringify(existing.tags)
    if (newTags !== oldTags) {
      await logActivity(id, 'edit', 'tags', newTags)
    }
  }

  return task
}

export async function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } })
}

export async function logActivity(
  taskId: string,
  type: ActivityType,
  from?: string,
  to?: string,
  note?: string,
  source: 'user' | 'system' = 'user'
) {
  return prisma.taskActivity.create({
    data: { taskId, type, from, to, note, source },
  })
}

export async function getTaskActivity(taskId: string) {
  return prisma.taskActivity.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  })
}
