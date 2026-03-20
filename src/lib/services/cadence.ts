// src/lib/services/cadence.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { addDays, startOfDay } from 'date-fns'

export async function getCadences() {
  return prisma.cadence.findMany({
    include: {
      prepItems: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getCadence(id: string) {
  return prisma.cadence.findUnique({
    where: { id },
    include: {
      prepItems: true,
      tasks: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
}

export async function createCadence(data: Prisma.CadenceCreateInput) {
  return prisma.cadence.create({ data })
}

export async function updateCadence(id: string, data: Prisma.CadenceUpdateInput) {
  return prisma.cadence.update({ where: { id }, data })
}

export async function deleteCadence(id: string) {
  return prisma.cadence.delete({ where: { id } })
}

export async function generatePrepTasks(cadenceId: string): Promise<number> {
  const cadence = await prisma.cadence.findUnique({
    where: { id: cadenceId },
    include: { prepItems: true },
  })
  if (!cadence) throw new Error('Cadence not found')

  let created = 0
  for (const item of cadence.prepItems) {
    const dueDate = addDays(startOfDay(new Date()), item.leadTimeDays)

    const existing = await prisma.task.findFirst({
      where: {
        cadenceId: cadence.id,
        title: item.title,
        createdAt: { gte: startOfDay(new Date()) },
      },
    })
    if (existing) continue

    await prisma.task.create({
      data: {
        title: item.title,
        department: item.department ?? cadence.scope,
        priority: 'high',
        source: 'cadence',
        dueDate,
        cadenceId: cadence.id,
        ...(item.assigneeId && { assigneeId: item.assigneeId }),
      },
    })
    created++
  }
  return created
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

function daysUntilNext(dayName: string): number {
  const today = new Date().getDay()
  const target = DAY_MAP[dayName]
  if (target === undefined) return 0 // non-standard day names like "Last Friday" — always include
  const diff = (target - today + 7) % 7
  return diff === 0 ? 7 : diff // if it's today, next occurrence is in 7 days
}

export async function generateAllDuePrepTasks(): Promise<number> {
  const cadences = await prisma.cadence.findMany({
    where: { isActive: true },
    include: { prepItems: true },
  })
  let total = 0
  for (const cadence of cadences) {
    const maxLeadTime = cadence.prepItems.reduce((max, item) => Math.max(max, item.leadTimeDays), 0)
    const daysAway = daysUntilNext(cadence.day)
    if (daysAway <= maxLeadTime) {
      total += await generatePrepTasks(cadence.id)
    }
  }
  return total
}
