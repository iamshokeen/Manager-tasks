import { NextResponse } from 'next/server'
import { emailReport } from '@/lib/services/reports'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    await emailReport(id, body.to)
    return NextResponse.json({ message: 'Report emailed' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send report' }, { status: 500 })
  }
}
