import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateWeeklyReport } from '@/lib/services/reports'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ data: reports })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const report = await generateWeeklyReport()
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
