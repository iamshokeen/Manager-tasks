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

  // Log field edits (title, description, dueDate, priority, tags)
  const editableFields: Array<keyof typeof existing> = ['title', 'description', 'dueDate', 'priority', 'tags']
  for (const field of editableFields) {
    if (field in data && String(data[field as keyof Prisma.TaskUpdateInput]) !== String(existing[field])) {
      await logActivity(id, 'edit', field, String(data[field as keyof Prisma.TaskUpdateInput]))
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
