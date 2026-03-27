// src/app/api/admin/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')
    const actionParam = searchParams.get('action')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (userIdParam) where.userId = userIdParam
    if (actionParam) where.action = actionParam

    if (fromParam || toParam) {
      const dateRange: { gte?: Date; lte?: Date } = {}
      if (fromParam) {
        const from = new Date(fromParam)
        if (!isNaN(from.getTime())) dateRange.gte = from
      }
      if (toParam) {
        const to = new Date(toParam)
        if (!isNaN(to.getTime())) {
          // Include the full end day
          to.setHours(23, 59, 59, 999)
          dateRange.lte = to
        }
      }
      if (Object.keys(dateRange).length > 0) where.createdAt = dateRange
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ data: logs })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
