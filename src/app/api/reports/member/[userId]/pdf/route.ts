// src/app/api/reports/member/[userId]/pdf/route.ts
//
// Session-authenticated PDF download for the manager UI. Public access
// from WhatsApp messages goes through the short /r/[slug] route, not
// this one — keeping this endpoint behind the session avoids leaking
// PDFs via a guessable URL.
//
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportPdf } from '@/lib/services/member-report-pdf'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }
  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const dateStr = dateParam ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  const anchor = new Date(`${dateStr}T12:00:00+05:30`)
  if (Number.isNaN(anchor.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 })

  const report = await getMemberReport(userId, anchor)
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buf = await renderMemberReportPdf(report)
  const filename = `kairos-brief-${report.member.name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.pdf`
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
