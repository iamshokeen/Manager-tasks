// src/app/api/reports/member/[userId]/send/route.ts
//
// Dispatch a daily brief as a PDF:
//   POST { channel: 'email' }    → renders the PDF, attaches it to an
//                                   inline-styled HTML cover email,
//                                   sends to user.reportEmail ?? user.email.
//   POST { channel: 'whatsapp' } → renders the PDF, mints a 7-day signed
//                                   download URL for it, and returns a
//                                   wa.me deeplink with the URL pre-filled.
//                                   Destination phone is
//                                   user.reportPhone ?? user.phone.
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportEmail, renderWhatsAppSummary } from '@/lib/services/member-report-email'
import { renderMemberReportPdf } from '@/lib/services/member-report-pdf'
import { sendEmail } from '@/lib/mailer'
import { mintBriefShortlink } from '@/lib/services/brief-shortlink'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairos-ai-hq.vercel.app'
}

function istDateStr(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d)
}

function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  const { userId } = await params
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (me.role !== 'SUPER_ADMIN') {
    const visible = await getVisibleUserIds(me.id, me.role ?? '')
    if (!visible.has(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: { channel?: 'email' | 'whatsapp'; date?: string; to?: string } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }
  const channel = body.channel
  if (channel !== 'email' && channel !== 'whatsapp') {
    return NextResponse.json({ error: 'channel must be email or whatsapp' }, { status: 400 })
  }

  const anchor = body.date ? new Date(`${body.date}T12:00:00+05:30`) : new Date()
  if (Number.isNaN(anchor.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 })

  const report = await getMemberReport(userId, anchor)
  if (!report) return NextResponse.json({ error: 'No report data' }, { status: 404 })

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, reportEmail: true, reportPhone: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const dateStr = body.date ?? istDateStr(anchor)
  const briefUrl = `${appUrl()}/reports/print/${userId}?date=${dateStr}&auto=0`
  const filename = `kairos-brief-${report.member.name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.pdf`

  if (channel === 'email') {
    const to = body.to ?? target.reportEmail ?? target.email
    if (!to) return NextResponse.json({ error: 'No email address on file' }, { status: 400 })
    let pdf: Buffer
    try {
      pdf = await renderMemberReportPdf(report)
    } catch (e) {
      console.error('[reports/send/email] pdf render failed', e)
      return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 })
    }
    const { subject, html, text } = renderMemberReportEmail(report, { briefUrl })
    try {
      await sendEmail({
        to, subject, html, text,
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      })
    } catch (e) {
      console.error('[reports/send/email]', e)
      // Surface the underlying SMTP error to the caller so the admin can
      // diagnose missing creds / bad app password / TLS problems instead of
      // staring at a generic "Failed to send email".
      const detail = e instanceof Error ? e.message : 'Unknown email error'
      return NextResponse.json({ error: detail }, { status: 502 })
    }
    return NextResponse.json({ data: { channel: 'email', to } })
  }

  // WhatsApp: mint a *short* /r/<slug> link valid for 7 days, attach it
  // to a compact summary, and hand back a wa.me deeplink the manager
  // opens to forward it. Short slug (~46-char total URL) survives
  // wa.me's silent truncation of long JWT URLs.
  const phoneRaw = target.reportPhone ?? target.phone
  const phoneDigits = phoneRaw ? normalizePhoneDigits(phoneRaw) : null
  const slug = await mintBriefShortlink(userId, dateStr)
  const pdfUrl = `${appUrl()}/r/${slug}`
  const message = `${renderWhatsAppSummary(report, undefined)}\n\nFull PDF: ${pdfUrl}`
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/'
  const link = `${base}?text=${encodeURIComponent(message)}`
  return NextResponse.json({
    data: { channel: 'whatsapp', link, hasPhone: !!phoneDigits, pdfUrl },
  })
}
