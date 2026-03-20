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

  return prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, department: true } },
      project: { select: { id: true, title: true, stage: true } },
      stakeholder: { select: { id: true, name: true } },
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
      activities: { orderBy: { createdAt: 'desc' } },
      emailThreads: { include: { emailThread: true } },
    },
  })
}

export async function createTask(data: Prisma.TaskCreateInput) {
  return prisma.task.create({ data })
}

export async function updateTask(id: string, data: Prisma.TaskUpdateInput, actorNote?: string) {
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) throw new Error('Task not found')

  const task = await prisma.task.update({ where: { id }, data })

  // Log status change
  if (data.status && data.status !== existing.status) {
    await logActivity(id, 'status_change', existing.status, data.status as string)
    if (data.status === 'done') {
      await logActivity(id, 'completion', undefined, undefined, actorNote)
    }
  }

  // Log assignment change
  if ('assigneeId' in data && data.assigneeId !== existing.assigneeId) {
    await logActivity(id, 'assignment', existing.assigneeId ?? undefined, data.assigneeId as string ?? undefined)
  }

  // Log simple string field edits
  const stringFields: Array<{ key: string; dataKey: keyof Prisma.TaskUpdateInput }> = [
    { key: 'title', dataKey: 'title' },
    { key: 'description', dataKey: 'description' },
    { key: 'priority', dataKey: 'priority' },
  ]
  for (const { key, dataKey } of stringFields) {
    if (dataKey in data && data[dataKey] !== undefined && String(data[dataKey]) !== String(existing[key as keyof typeof existing])) {
      await logActivity(id, 'edit', key, String(data[dataKey]))
    }
  }

  // Log dueDate change — compare ISO strings to avoid timezone format mismatch
  if ('dueDate' in data && data.dueDate !== undefined) {
    const newDate = data.dueDate ? new Date(data.dueDate as string).toISOString() : null
    const oldDate = existing.dueDate ? existing.dueDate.toISOString() : null
    if (newDate !== oldDate) {
      await logActivity(id, 'edit', 'dueDate', newDate ?? 'cleared')
    }
  }

  // Log tags change — only if plain array (not Prisma relational update object)
  if ('tags' in data && Array.isArray(data.tags)) {
    const newTags = JSON.stringify(data.tags)
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
