// src/app/api/activity/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
