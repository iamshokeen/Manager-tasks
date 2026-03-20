// src/app/api/cron/prep-tasks/route.ts
import { NextResponse } from 'next/server'
import { generateAllDuePrepTasks } from '@/lib/services/cadence'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await generateAllDuePrepTasks()
  return NextResponse.json({ created: count })
}
