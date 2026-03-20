// src/app/api/cron/prep-tasks/route.ts
import { NextResponse } from 'next/server'
import { generateAllDuePrepTasks } from '@/lib/services/cadence'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const count = await generateAllDuePrepTasks()
    return NextResponse.json({ created: count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to generate prep tasks' }, { status: 500 })
  }
}
