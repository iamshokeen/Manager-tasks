// src/app/api/admin/kpi-requests/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role ?? ''
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status } = body as { status: 'approved' | 'denied' }

  if (!status || !['approved', 'denied'].includes(status)) {
    return NextResponse.json({ error: 'status must be approved or denied' }, { status: 400 })
  }

  try {
    const request = await prisma.kpiAccessRequest.update({
      where: { id },
      data: { status },
    })

    // On approval: grant KpiVisibility for revenue
    if (status === 'approved') {
      await prisma.kpiVisibility.upsert({
        where: { userId_kpiKey: { userId: request.userId, kpiKey: 'revenue' } },
        update: { isVisible: true },
        create: { userId: request.userId, kpiKey: 'revenue', isVisible: true },
      })
    }

    return NextResponse.json({ data: request })
  } catch {
    return NextResponse.json({ error: 'Failed to update KPI request' }, { status: 500 })
  }
}
