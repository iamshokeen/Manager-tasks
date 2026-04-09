// src/lib/services/projects.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getProjects(
  filters: { stage?: string; department?: string } = {},
  ownershipFilter?: { userId: string; teamMemberId?: string; isSuperAdmin?: boolean }
) {
  const baseWhere: Prisma.ProjectWhereInput = {
    ...(filters.stage && { stage: filters.stage }),
    ...(filters.department && { department: filters.department }),
  }

  if (ownershipFilter) {
    const { userId, teamMemberId, isSuperAdmin } = ownershipFilter

    if (isSuperAdmin) {
      // Super admin / manager: only see projects they created, or projects with a linked stakeholder
      baseWhere.OR = [
        { createdByUserId: userId },
        { stakeholderId: { not: null } },
        { stakeholders: { some: {} } },
      ]
    } else {
      // Everyone else: see projects they created, or have tasks assigned to them
      const involvementClauses: Prisma.ProjectWhereInput[] = [
        { createdByUserId: userId },
        { tasks: { some: { createdByUserId: userId } } },
      ]
      if (teamMemberId) {
        involvementClauses.push({ tasks: { some: { assigneeId: teamMemberId } } })
      }
      baseWhere.OR = involvementClauses
    }
  }

  return prisma.project.findMany({
    where: baseWhere,
    include: {
      owner: { select: { id: true, name: true } },
      stakeholder: { select: { id: true, name: true } },
      stakeholders: { include: { stakeholder: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true } },
      tasks: { select: { id: true, status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      stakeholder: true,
      stakeholders: { include: { stakeholder: { select: { id: true, name: true, title: true } } } },
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  })
}

export async function createProject(
  data: Prisma.ProjectCreateInput & { stakeholderIds?: string[] }
) {
  const { stakeholderIds, ...rest } = data as Record<string, unknown> & { stakeholderIds?: string[] }
  const projectData = rest as Prisma.ProjectCreateInput

  const project = await prisma.project.create({ data: projectData })

  if (stakeholderIds && stakeholderIds.length > 0) {
    await prisma.projectStakeholder.createMany({
      data: stakeholderIds.map(sId => ({ projectId: project.id, stakeholderId: sId })),
      skipDuplicates: true,
    })
  }

  return project
}

export async function updateProject(
  id: string,
  data: Prisma.ProjectUpdateInput & { stakeholderIds?: string[] }
) {
  const { stakeholderIds, ...rest } = data as Record<string, unknown> & { stakeholderIds?: string[] }
  const projectData = rest as Prisma.ProjectUpdateInput

  const project = await prisma.project.update({ where: { id }, data: projectData })

  if (stakeholderIds !== undefined) {
    await prisma.projectStakeholder.deleteMany({ where: { projectId: id } })
    if (stakeholderIds.length > 0) {
      await prisma.projectStakeholder.createMany({
        data: stakeholderIds.map(sId => ({ projectId: id, stakeholderId: sId })),
        skipDuplicates: true,
      })
    }
  }

  return project
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}
