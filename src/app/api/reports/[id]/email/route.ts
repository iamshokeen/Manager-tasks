import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { emailReport } from '@/lib/services/reports'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    await emailReport(id, body.to)
    return NextResponse.json({ message: 'Report emailed' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send report' }, { status: 500 })
  }
}
