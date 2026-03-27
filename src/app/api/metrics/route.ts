import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentMonthPeriod } from '@/lib/format'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
