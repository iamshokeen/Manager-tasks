// src/app/api/admin/kpi-requests/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role ?? ''
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const requests = await prisma.kpiAccessRequest.findMany({
      where: { status: 'pending' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ data: requests })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KPI requests' }, { status: 500 })
  }
}
