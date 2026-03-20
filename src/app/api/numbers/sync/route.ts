import { NextResponse } from 'next/server'
import { syncFromSheets } from '@/lib/services/numbers'

export async function POST() {
  try {
    const synced = await syncFromSheets()
    return NextResponse.json({ synced })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Sync failed' }, { status: 500 })
  }
}
