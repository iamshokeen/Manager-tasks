// src/lib/services/tasks.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { TaskFilters, ActivityType } from '@/types'

export async function getTasks(filters: TaskFilters = {}) {
  const where: Prisma.TaskWhereInput = {}
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

  // Ownership isolation: see tasks you created, are assigned to, or assigned to others
  if (filters.ownershipFilter) {
    const { userId, teamMemberId } = filters.ownershipFilter
    const orClauses: Prisma.TaskWhereInput[] = [{ createdByUserId: userId }]
    if (teamMemberId) orClauses.push({ assigneeId: teamMemberId })
    where.OR = orClauses
  } else if (filters.contributorFilter) {
    // legacy fallback
    const { teamMemberId, name } = filters.contributorFilter
    const orClauses: Prisma.TaskWhereInput[] = [{ assignedByName: name }]
    if (teamMemberId) orClauses.push({ assigneeId: teamMemberId })
    where.OR = orClauses
  }

  return prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, department: true } },
      project: { select: { id: true, title: true, stage: true } },
      stakeholder: { select: { id: true, name: true } },
      stakeholders: { include: { stakeholder: { select: { id: true, name: true } } } },
      _count: { select: { activities: true } },
    },
    orderBy: [
      { priority: 'asc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  })
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
