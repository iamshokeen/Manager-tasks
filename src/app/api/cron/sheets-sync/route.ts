// src/app/api/cron/sheets-sync/route.ts
import { NextResponse } from 'next/server'
import { syncFromSheets } from '@/lib/services/numbers'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const synced = await syncFromSheets()
    return NextResponse.json({ synced })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
