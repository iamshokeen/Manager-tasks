// src/app/api/activity/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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
