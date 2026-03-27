import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { syncFromSheets } from '@/lib/services/numbers'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const synced = await syncFromSheets()
    return NextResponse.json({ synced })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Sync failed' }, { status: 500 })
  }
}
