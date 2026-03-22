import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentMonthPeriod } from '@/lib/format'

export async function GET() {
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
