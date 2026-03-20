// src/lib/services/team.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getTeamMembers() {
  return prisma.teamMember.findMany({
    include: { _count: { select: { tasks: true, oneOnOnes: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getTeamMember(id: string) {
  return prisma.teamMember.findUnique({
    where: { id },
    include: {
      tasks: { where: { status: { not: 'done' } }, orderBy: { priority: 'asc' } },
      oneOnOnes: { orderBy: { date: 'desc' }, take: 5, include: { actionItems: true } },
      _count: { select: { tasks: true, oneOnOnes: true } },
    },
  })
}

export async function createTeamMember(data: Prisma.TeamMemberCreateInput) {
  return prisma.teamMember.create({ data })
}

export async function updateTeamMember(id: string, data: Prisma.TeamMemberUpdateInput) {
  return prisma.teamMember.update({ where: { id }, data })
}

export async function deleteTeamMember(id: string) {
  return prisma.teamMember.delete({ where: { id } })
}
