// src/app/api/cron/sheets-sync/route.ts
import { NextResponse } from 'next/server'
import { syncFromSheets } from '@/lib/services/numbers'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const synced = await syncFromSheets()
    return NextResponse.json({ synced })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
