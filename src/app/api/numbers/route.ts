import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCurrentMetrics, upsertMetric } from '@/lib/services/numbers'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const metrics = await getCurrentMetrics()
    return NextResponse.json({ data: metrics }, {
      headers: { 'Cache-Control': 'public, max-age=0, stale-while-revalidate=3600' },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { metric, value, period } = await req.json()
    if (!metric || value === undefined || !period) {
      return NextResponse.json({ error: 'metric, value, and period are required' }, { status: 400 })
    }
    const entry = await upsertMetric(metric, value, period)
    return NextResponse.json({ data: entry }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save metric' }, { status: 500 })
  }
}
