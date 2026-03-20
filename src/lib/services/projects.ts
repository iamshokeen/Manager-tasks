// src/lib/services/projects.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getProjects(filters: { stage?: string; department?: string } = {}) {
  return prisma.project.findMany({
    where: {
      ...(filters.stage && { stage: filters.stage }),
      ...(filters.department && { department: filters.department }),
    },
    include: {
      owner: { select: { id: true, name: true } },
      stakeholder: { select: { id: true, name: true } },
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
      tasks: {
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      },
    },
  })
}

export async function createProject(data: Prisma.ProjectCreateInput) {
  return prisma.project.create({ data })
}

export async function updateProject(id: string, data: Prisma.ProjectUpdateInput) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}
