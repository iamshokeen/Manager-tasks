// __tests__/lib/services/recurring-tasks.test.ts
import {
  computeNextRunAt,
  computeOccurrences,
  syncTemplateTasks,
  deleteManagedTasks,
  type Frequency,
} from '@/lib/services/recurring-tasks'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    recurringTaskTemplate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

function d(s: string): Date {
  // Local midnight to match startOfDay() semantics.
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

describe('computeNextRunAt', () => {
  it('daily, no end, from start', () => {
    const next = computeNextRunAt(
      { frequency: 'daily', interval: 1, daysOfWeek: [], dayOfMonth: null, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-01'),
    )
    expect(next?.getTime()).toBe(d('2026-05-01').getTime())
  })

  it('daily every 3 days, advances correctly', () => {
    const next = computeNextRunAt(
      { frequency: 'daily', interval: 3, daysOfWeek: [], dayOfMonth: null, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-02'),
    )
    expect(next?.getTime()).toBe(d('2026-05-04').getTime())
  })

  it('weekly Mon/Wed, picks next Mon', () => {
    // 2026-05-04 is a Monday. From Sunday 2026-05-03 the next Mon=2026-05-04.
    const next = computeNextRunAt(
      { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3], dayOfMonth: null, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-03'),
    )
    expect(next?.getTime()).toBe(d('2026-05-04').getTime())
  })

  it('monthly day 15', () => {
    const next = computeNextRunAt(
      { frequency: 'monthly', interval: 1, daysOfWeek: [], dayOfMonth: 15, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-01'),
    )
    expect(next?.getTime()).toBe(d('2026-05-15').getTime())
  })

  it('monthly day 31 clamps in Feb', () => {
    const next = computeNextRunAt(
      { frequency: 'monthly', interval: 1, daysOfWeek: [], dayOfMonth: 31, startDate: d('2026-01-31'), endDate: null },
      d('2026-02-01'),
    )
    // Feb 2026 has 28 days.
    expect(next?.getTime()).toBe(d('2026-02-28').getTime())
  })

  it('returns null past endDate', () => {
    const next = computeNextRunAt(
      { frequency: 'daily', interval: 1, daysOfWeek: [], dayOfMonth: null, startDate: d('2026-05-01'), endDate: d('2026-05-03') },
      d('2026-05-04'),
    )
    expect(next).toBeNull()
  })
})

describe('computeOccurrences', () => {
  it('daily over a week', () => {
    const occ = computeOccurrences(
      { frequency: 'daily', interval: 1, daysOfWeek: [], dayOfMonth: null, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-07'),
    )
    expect(occ).toHaveLength(7)
    expect(occ[0].getTime()).toBe(d('2026-05-01').getTime())
    expect(occ[6].getTime()).toBe(d('2026-05-07').getTime())
  })

  it('weekly Mon/Wed over two weeks', () => {
    // Anchor 2026-05-01 (Fri). Weekly Mon (1) Wed (3).
    const occ = computeOccurrences(
      { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3], dayOfMonth: null, startDate: d('2026-05-01'), endDate: null },
      d('2026-05-14'),
    )
    // Week of 2026-05-03: Mon 2026-05-04, Wed 2026-05-06.
    // Week of 2026-05-10: Mon 2026-05-11, Wed 2026-05-13.
    expect(occ.map((x) => x.toISOString().slice(0, 10))).toEqual([
      '2026-05-04', '2026-05-06', '2026-05-11', '2026-05-13',
    ].map((s) => d(s).toISOString().slice(0, 10)))
  })

  it('honors endDate before horizon', () => {
    const occ = computeOccurrences(
      { frequency: 'daily', interval: 1, daysOfWeek: [], dayOfMonth: null, startDate: d('2026-05-01'), endDate: d('2026-05-03') },
      d('2026-12-31'),
    )
    expect(occ).toHaveLength(3)
  })
})

describe('syncTemplateTasks', () => {
  const now = d('2026-05-19')

  beforeEach(() => jest.clearAllMocks())

  it('creates tasks for every upcoming occurrence when none exist', async () => {
    ;(prisma.recurringTaskTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      title: 'Standup',
      description: null,
      priority: 'medium',
      department: 'Eng',
      assigneeId: null,
      isSelfTask: false,
      projectId: null,
      stakeholderId: null,
      createdByUserId: 'u1',
      frequency: 'daily' as Frequency,
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      dueOffsetDays: 0,
      startDate: d('2026-05-19'),
      endDate: d('2026-05-21'),
      isActive: true,
      lastGeneratedAt: null,
    })
    ;(prisma.task.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.task.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: `task-${data.dueDate.toISOString().slice(0, 10)}` }),
    )

    const res = await syncTemplateTasks('t1', now)

    expect(res.created).toHaveLength(3)
    expect(prisma.task.create).toHaveBeenCalledTimes(3)
    expect(prisma.recurringTaskTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1' } }),
    )
  })

  it('updates drifted managed tasks to match template fields', async () => {
    ;(prisma.recurringTaskTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      title: 'New Title',
      description: 'Updated',
      priority: 'high',
      department: 'Ops',
      assigneeId: 'a1',
      isSelfTask: false,
      projectId: null,
      stakeholderId: null,
      createdByUserId: 'u1',
      frequency: 'daily' as Frequency,
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      dueOffsetDays: 0,
      startDate: d('2026-05-19'),
      endDate: d('2026-05-19'),
      isActive: true,
      lastGeneratedAt: null,
    })
    ;(prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-1',
        title: 'Old Title',
        description: null,
        priority: 'medium',
        department: 'Eng',
        assigneeId: null,
        isSelfTask: false,
        projectId: null,
        stakeholderId: null,
        dueDate: d('2026-05-19'),
      },
    ])

    const res = await syncTemplateTasks('t1', now)

    expect(res.updated).toEqual(['task-1'])
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({ title: 'New Title', priority: 'high' }),
      }),
    )
    expect(res.created).toHaveLength(0)
    expect(res.deleted).toHaveLength(0)
  })

  it('deletes managed tasks no longer matching the occurrence set', async () => {
    // Template changed: now only Mon/Wed; existing Tue task should be removed.
    ;(prisma.recurringTaskTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      title: 'Standup',
      description: null,
      priority: 'medium',
      department: 'Eng',
      assigneeId: null,
      isSelfTask: false,
      projectId: null,
      stakeholderId: null,
      createdByUserId: 'u1',
      frequency: 'weekly' as Frequency,
      interval: 1,
      daysOfWeek: [1, 3], // Mon, Wed
      dayOfMonth: null,
      dueOffsetDays: 0,
      startDate: d('2026-05-19'), // Tue 2026-05-19 — actually Tuesday. Wait — let me pick startDate carefully.
      endDate: d('2026-05-22'),
      isActive: true,
      lastGeneratedAt: null,
    })
    // Existing Tuesday task that no longer matches.
    ;(prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'tue-task',
        title: 'Standup',
        description: null,
        priority: 'medium',
        department: 'Eng',
        assigneeId: null,
        isSelfTask: false,
        projectId: null,
        stakeholderId: null,
        dueDate: d('2026-05-19'), // Tuesday — not in Mon/Wed
      },
    ])
    ;(prisma.task.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: `task-${data.dueDate.toISOString().slice(0, 10)}` }),
    )

    const res = await syncTemplateTasks('t1', now)

    expect(res.deleted).toEqual(['tue-task'])
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'tue-task' } })
  })

  it('paused template (isActive=false) clears future managed tasks', async () => {
    ;(prisma.recurringTaskTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      title: 'Standup',
      description: null,
      priority: 'medium',
      department: 'Eng',
      assigneeId: null,
      isSelfTask: false,
      projectId: null,
      stakeholderId: null,
      createdByUserId: 'u1',
      frequency: 'daily' as Frequency,
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: null,
      dueOffsetDays: 0,
      startDate: d('2026-05-19'),
      endDate: null,
      isActive: false,
      lastGeneratedAt: null,
    })
    ;(prisma.task.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'future-task',
        title: 'Standup',
        description: null,
        priority: 'medium',
        department: 'Eng',
        assigneeId: null,
        isSelfTask: false,
        projectId: null,
        stakeholderId: null,
        dueDate: d('2026-05-25'),
      },
    ])

    const res = await syncTemplateTasks('t1', now)

    expect(res.deleted).toEqual(['future-task'])
    expect(res.created).toHaveLength(0)
  })

  it('returns empty result for missing template', async () => {
    ;(prisma.recurringTaskTemplate.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await syncTemplateTasks('missing', now)
    expect(res).toEqual({ created: [], updated: [], deleted: [] })
  })
})

describe('deleteManagedTasks', () => {
  it('only deletes future, status=todo, recurring tasks', async () => {
    ;(prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 5 })
    const n = await deleteManagedTasks('t1', d('2026-05-19'))
    expect(n).toBe(5)
    expect(prisma.task.deleteMany).toHaveBeenCalledWith({
      where: {
        fromRecurringId: 't1',
        status: 'todo',
        dueDate: { gte: expect.any(Date) },
      },
    })
  })
})
