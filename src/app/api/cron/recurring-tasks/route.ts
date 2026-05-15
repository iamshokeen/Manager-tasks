// src/app/api/cron/recurring-tasks/route.ts
//
// Daily generator for RecurringTaskTemplate. Wire cron-job.org to this URL
// with `Authorization: Bearer ${CRON_SECRET}`.
import { NextResponse } from 'next/server'
import { generateDueTasks } from '@/lib/services/recurring-tasks'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const generatedIds = await generateDueTasks()
    return NextResponse.json({ generated: generatedIds.length, ids: generatedIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to generate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
