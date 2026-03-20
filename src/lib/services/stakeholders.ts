// src/lib/services/stakeholders.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getStakeholders() {
  return prisma.stakeholder.findMany({
    include: {
      _count: { select: { tasks: true, projects: true } },
      tasks: { where: { status: { not: 'done' } }, select: { id: true, title: true, priority: true, dueDate: true } },
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
