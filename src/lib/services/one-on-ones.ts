// src/lib/services/one-on-ones.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getOneOnOnes(memberId?: string) {
  return prisma.oneOnOne.findMany({
    where: memberId ? { memberId } : undefined,
    include: {
      member: { select: { id: true, name: true, department: true } },
      actionItems: true,
    },
    orderBy: { date: 'desc' },
  })
}

export async function getOneOnOne(id: string) {
  return prisma.oneOnOne.findUnique({
    where: { id },
    include: { member: true, actionItems: true },
  })
}

export async function createOneOnOne(data: Prisma.OneOnOneCreateInput) {
  return prisma.oneOnOne.create({ data, include: { actionItems: true } })
}

export async function updateOneOnOne(id: string, data: Prisma.OneOnOneUpdateInput) {
  return prisma.oneOnOne.update({ where: { id }, data })
}

export async function updateActionItem(id: string, completed: boolean) {
  return prisma.oneOnOneAction.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  })
}
