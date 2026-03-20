import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklyReport } from '@/lib/services/reports'

export async function GET() {
  try {
    const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ data: reports })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const report = await generateWeeklyReport()
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
