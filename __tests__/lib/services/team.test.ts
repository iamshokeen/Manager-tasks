// __tests__/lib/services/team.test.ts
import { getTeamMembers, getTeamMember, createTeamMember, updateTeamMember, deleteTeamMember } from '@/lib/services/team'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const mockMember = {
  id: 'test-1',
  name: 'Test Member',
  role: 'Analyst',
  department: 'Analytics',
  status: 'active',
  delegationLevel: 2,
  skills: null, oneOnOneDay: null, oneOnOneTime: null,
  coachingNotes: null, hireDate: null,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('team service', () => {
  beforeEach(() => jest.clearAllMocks())

  it('getTeamMembers returns all members', async () => {
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([mockMember])
    const result = await getTeamMembers()
    expect(result).toHaveLength(1)
    expect(prisma.teamMember.findMany).toHaveBeenCalledWith({
      include: { _count: { select: { tasks: true, oneOnOnes: true } } },
      orderBy: { name: 'asc' },
    })
  })

  it('getTeamMember returns null for unknown id', async () => {
    ;(prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await getTeamMember('unknown')
    expect(result).toBeNull()
  })

  it('createTeamMember creates a member', async () => {
    ;(prisma.teamMember.create as jest.Mock).mockResolvedValue(mockMember)
    const result = await createTeamMember({ name: 'Test', role: 'Analyst', department: 'Analytics' })
    expect(result.name).toBe('Test Member')
  })

  it('updateTeamMember calls update with correct args', async () => {
    ;(prisma.teamMember.update as jest.Mock).mockResolvedValue(mockMember)
    await updateTeamMember('test-1', { delegationLevel: 3 })
    expect(prisma.teamMember.update).toHaveBeenCalledWith({ where: { id: 'test-1' }, data: { delegationLevel: 3 } })
  })

  it('deleteTeamMember calls delete', async () => {
    ;(prisma.teamMember.delete as jest.Mock).mockResolvedValue(mockMember)
    await deleteTeamMember('test-1')
    expect(prisma.teamMember.delete).toHaveBeenCalledWith({ where: { id: 'test-1' } })
  })
})
