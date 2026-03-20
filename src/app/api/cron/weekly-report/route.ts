// src/app/api/cron/weekly-report/route.ts
import { NextResponse } from 'next/server'
import { generateWeeklyReport, emailReport } from '@/lib/services/reports'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const report = await generateWeeklyReport()
  await emailReport(report.id)
  return NextResponse.json({ reportId: report.id, period: report.period })
}
