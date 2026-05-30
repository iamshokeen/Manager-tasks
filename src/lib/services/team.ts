// src/lib/services/team.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Tasks scheduled in the future (e.g. recurring occurrences materialized for
// the next year) shouldn't inflate per-member counts on the Team page or the
// open-tasks panel on a member's detail. We bucket by "due today or earlier
// (or undated)" — that's the work that's actually actionable now.
function tasksTodayOrEarlierWhere(): Prisma.TaskWhereInput {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  return { OR: [{ dueDate: null }, { dueDate: { lte: endOfToday } }] }
}

export async function getTeamMembers() {
  return prisma.teamMember.findMany({
    include: {
      _count: {
        select: {
          tasks: { where: tasksTodayOrEarlierWhere() },
          oneOnOnes: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getTeamMember(id: string) {
  return prisma.teamMember.findUnique({
    where: { id },
    include: {
      tasks: {
        where: { status: { not: 'done' }, ...tasksTodayOrEarlierWhere() },
        orderBy: { priority: 'asc' },
      },
      oneOnOnes: { orderBy: { date: 'desc' }, take: 5, include: { actionItems: true } },
      _count: {
        select: {
          tasks: { where: tasksTodayOrEarlierWhere() },
          oneOnOnes: true,
        },
      },
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
