// src/app/api/reports/member/[userId]/route.ts
//
// Returns the daily report payload for a single user. Visibility is
// enforced via the manager chain (SA bypasses).
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport } from '@/lib/services/member-report'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  const { userId } = await params
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Visibility: SA sees everyone; others can only see users in their chain
  // (including themselves).
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const anchor = dateParam ? new Date(dateParam) : new Date()
  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  try {
    const report = await getMemberReport(userId, anchor)
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: report })
  } catch (e) {
    console.error('[member-report]', e)
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 })
  }
}
