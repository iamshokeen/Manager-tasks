import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentMonthPeriod } from '@/lib/format'
import { getSession } from '@/lib/auth'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'MANAGER', 'EXEC_VIEWER']

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role ?? ''

  if (!ALLOWED_ROLES.includes(userRole)) {
    // Check if user has been explicitly granted KPI access
    const userId = (session.user as { id?: string }).id ?? ''
    const access = await prisma.kpiVisibility.findUnique({
      where: { userId_kpiKey: { userId, kpiKey: 'revenue' } },
    })
    if (!access?.isVisible) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const entries = await prisma.numberEntry.findMany({
      where: { period: { in: ['FY27', getCurrentMonthPeriod()] } },
    })
    const data: Record<string, number> = {}
    for (const e of entries) data[e.metric] = e.value
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, max-age=0, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
