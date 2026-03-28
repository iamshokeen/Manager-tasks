// src/app/api/activity/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const CONTRIBUTOR_ROLES = ['DIRECT_REPORT', 'SENIOR_IC']

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { role?: string; teamMemberId?: string }
  const userRole = user.role ?? ''

  if (CONTRIBUTOR_ROLES.includes(userRole)) {
    if (!user.teamMemberId) return NextResponse.json({ activities: [] })
    const activities = await prisma.taskActivity.findMany({
      where: { task: { assigneeId: user.teamMemberId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { task: { select: { id: true, title: true } } },
    })
    return NextResponse.json({ activities })
  }

  try {
    const activities = await prisma.taskActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        task: { select: { id: true, title: true } },
      },
    })
    return NextResponse.json({ activities })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
