// src/lib/services/stakeholders.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// See team.ts for the rationale — future-dated recurring occurrences shouldn't
// inflate per-stakeholder task counts on the CRM page.
function tasksTodayOrEarlierWhere(): Prisma.TaskWhereInput {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return { OR: [{ dueDate: null }, { dueDate: { lte: endOfToday } }] }
}

export async function getStakeholders() {
  return prisma.stakeholder.findMany({
    include: {
      _count: {
        select: {
          tasks: { where: tasksTodayOrEarlierWhere() },
          projects: true,
        },
      },
      tasks: {
        where: { status: { not: 'done' }, ...tasksTodayOrEarlierWhere() },
        select: { id: true, title: true, priority: true, dueDate: true },
      },
    },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
  })
}

export async function getStakeholder(id: string) {
  return prisma.stakeholder.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }] },
      projects: { orderBy: { updatedAt: 'desc' } },
    },
  })
}

export async function createStakeholder(data: Prisma.StakeholderCreateInput) {
  return prisma.stakeholder.create({ data })
}

export async function updateStakeholder(id: string, data: Prisma.StakeholderUpdateInput) {
  return prisma.stakeholder.update({ where: { id }, data })
}

export async function deleteStakeholder(id: string) {
  return prisma.stakeholder.delete({ where: { id } })
}
