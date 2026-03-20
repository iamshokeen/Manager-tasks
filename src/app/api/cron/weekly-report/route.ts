// src/app/api/cron/weekly-report/route.ts
import { NextResponse } from 'next/server'
import { generateWeeklyReport, emailReport } from '@/lib/services/reports'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const report = await generateWeeklyReport()
    await emailReport(report.id)
    return NextResponse.json({ reportId: report.id, period: report.period })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to generate report' }, { status: 500 })
  }
}
