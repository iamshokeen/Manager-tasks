// src/app/api/reports/member/[userId]/send/route.ts
//
// Dispatch a daily brief to its owner.
//   POST { channel: 'email' }                     → sends via SMTP
//   POST { channel: 'whatsapp' }                  → returns a wa.me deeplink
//                                                    (no API keys to send for
//                                                    real; caller opens the
//                                                    URL and taps Send)
//
// Visibility: SA always, others must have the target user in their chain.
//
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/rbac'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportEmail, renderWhatsAppSummary } from '@/lib/services/member-report-email'
import { sendEmail } from '@/lib/mailer'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairos-ai-hq.vercel.app'
}

// Strip everything except digits so wa.me accepts the number; the field
// stores E.164 so we just drop the leading '+'.
function normalizePhone(raw: string): string | null {
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
  try { body = await req.json() } catch { /* empty body is fine for GET-style */ }
  const channel = body.channel
  if (channel !== 'email' && channel !== 'whatsapp') {
    return NextResponse.json({ error: 'channel must be email or whatsapp' }, { status: 400 })
  }

  const anchor = body.date ? new Date(body.date) : new Date()
  if (Number.isNaN(anchor.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 })

  const report = await getMemberReport(userId, anchor)
  if (!report) return NextResponse.json({ error: 'No report data' }, { status: 404 })

  const dateParam = body.date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(anchor)
  const briefUrl = `${appUrl()}/reports/print/${userId}?date=${dateParam}&auto=0`

  if (channel === 'email') {
    // Pull the freshest email — body.to wins for one-off overrides.
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    const to = body.to ?? target?.email
    if (!to) return NextResponse.json({ error: 'No email address on file' }, { status: 400 })

    const { subject, html, text } = renderMemberReportEmail(report, { briefUrl })
    try {
      await sendEmail({ to, subject, html, text })
    } catch (e) {
      console.error('[reports/send/email]', e)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 502 })
    }
    return NextResponse.json({ data: { channel: 'email', to } })
  }

  // WhatsApp deeplink — no paid API required. Caller opens the URL in a
  // new tab; WhatsApp Web / mobile pre-fills the message and the user
  // taps Send. If the user has no phone on file, fall back to a generic
  // wa.me link so the manager can paste a number manually.
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  const phoneDigits = target?.phone ? normalizePhone(target.phone) : null
  const message = renderWhatsAppSummary(report, briefUrl)
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : 'https://wa.me/'
  const link = `${base}?text=${encodeURIComponent(message)}`
  return NextResponse.json({
    data: {
      channel: 'whatsapp',
      link,
      hasPhone: !!phoneDigits,
    },
  })
}
