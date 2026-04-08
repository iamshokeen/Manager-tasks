// src/lib/services/one-on-ones.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getOneOnOnes(
  memberId?: string,
  ownershipFilter?: { userId: string; teamMemberId?: string }
) {
  const where: Prisma.OneOnOneWhereInput = {}
  if (memberId) where.memberId = memberId
  if (ownershipFilter) {
    const orClauses: Prisma.OneOnOneWhereInput[] = [
      { createdByUserId: ownershipFilter.userId },
    ]
    if (ownershipFilter.teamMemberId) {
      orClauses.push({ memberId: ownershipFilter.teamMemberId })
    }
    where.OR = orClauses
  }
  return prisma.oneOnOne.findMany({
    where,
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

export async function deleteOneOnOne(id: string) {
  return prisma.oneOnOne.delete({ where: { id } })
}

export async function updateActionItem(id: string, completed: boolean) {
  return prisma.oneOnOneAction.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  })
}
