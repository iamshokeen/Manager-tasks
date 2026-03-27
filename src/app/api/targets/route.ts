import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTargets } from '@/lib/services/targets'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const targets = await getTargets()
    return NextResponse.json({ targets }, {
      headers: { 'Cache-Control': 'public, max-age=0, stale-while-revalidate=3600' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
