import { NextResponse } from 'next/server'
import { getCurrentMetrics, upsertMetric } from '@/lib/services/numbers'

export async function GET() {
  try {
    const metrics = await getCurrentMetrics()
    return NextResponse.json({ data: metrics })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

export async function POST(req: Request) {
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
