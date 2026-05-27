// src/app/api/reports/member/[userId]/pdf/route.ts
//
// Returns the daily brief as a downloadable PDF. Two access modes:
//   1. Authenticated session (the manager downloading from the UI).
//   2. JWT token in ?token=... (recipient clicking a link from a
//      WhatsApp message). The token encodes userId + day + an expiry.
//
import { NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportPdf } from '@/lib/services/member-report-pdf'

const TOKEN_AUD = 'kairos.reports.pdf'
const TOKEN_TTL_DAYS = 7

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(s)
}

export async function signPdfDownloadToken(userId: string, dateStr: string): Promise<string> {
  return await new SignJWT({ uid: userId, date: dateStr })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setAudience(TOKEN_AUD)
    .setExpirationTime(`${TOKEN_TTL_DAYS}d`)
    .sign(secret())
}

async function verifyPdfDownloadToken(token: string): Promise<{ uid: string; date: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: TOKEN_AUD })
    if (typeof payload.uid !== 'string' || typeof payload.date !== 'string') return null
    return { uid: payload.uid, date: payload.date }
  } catch {
    return null
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const tokenParam = searchParams.get('token')
  const dateParam = searchParams.get('date')

  let allowedUserId = userId
  let dateStr = dateParam ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

  if (tokenParam) {
    const verified = await verifyPdfDownloadToken(tokenParam)
    if (!verified || verified.uid !== userId) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
    }
    allowedUserId = verified.uid
    dateStr = verified.date
  } else {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const me = session.user as { id: string; role?: string }
    if (me.role !== 'SUPER_ADMIN') {
      const visible = await getVisibleUserIds(me.id, me.role ?? '')
      if (!visible.has(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const anchor = new Date(`${dateStr}T12:00:00+05:30`)
  if (Number.isNaN(anchor.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 })

  const report = await getMemberReport(allowedUserId, anchor)
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buf = await renderMemberReportPdf(report)
  const filename = `kairos-brief-${report.member.name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.pdf`
  // Convert Node Buffer to a Web-compatible Uint8Array so NextResponse can stream it.
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
