// src/app/api/admin/email-diag/route.ts
//
// SA-only diagnostic for the auto-brief email pipeline. Tells the admin in
// one call:
//   - Which env vars the cron / mailer rely on are actually set in this
//     deployment (SMTP_USER, SMTP_PASS, CRON_SECRET, NEXT_PUBLIC_APP_URL).
//   - Whether the SMTP transport can authenticate against Gmail right now
//     (mailer.verifyTransport — does not send a message).
//   - How many users are currently configured to receive auto-briefs and
//     whether their recipient address resolves.
//
// POST { testTo: "you@example.com" } sends a one-line test email to that
// address using the same mailer the cron uses, so a successful response
// proves the cron will be able to deliver too.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { sendEmail, verifyTransport } from '@/lib/mailer'

function envStatus() {
  const have = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0)
  return {
    SMTP_USER: have('SMTP_USER'),
    SMTP_PASS: have('SMTP_PASS'),
    CRON_SECRET: have('CRON_SECRET'),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }
}

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      reportSchedule: { in: ['daily', 'weekly'] },
      reportChannels: { in: ['email', 'both'] },
    },
    select: {
      id: true, name: true, email: true, reportEmail: true,
      reportSchedule: true, reportChannels: true, reportWeekday: true,
    },
  })

  const transport = await verifyTransport()

  return NextResponse.json({
    data: {
      env: envStatus(),
      transport,
      recipients: recipients.map((u) => ({
        id: u.id,
        name: u.name,
        to: u.reportEmail ?? u.email,
        schedule: u.reportSchedule,
        channels: u.reportChannels,
        weekday: u.reportWeekday,
      })),
      recipientCount: recipients.length,
    },
  })
}

export async function POST(req: Request) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (me.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { testTo?: string } = {}
  try { body = await req.json() } catch { /* allow empty */ }
  const testTo = body.testTo?.trim()
  if (!testTo) return NextResponse.json({ error: 'testTo required' }, { status: 400 })

  try {
    await sendEmail({
      to: testTo,
      subject: 'Kairos email diagnostic',
      html: '<p>If you can read this, Kairos SMTP is working end-to-end.</p>',
      text: 'If you can read this, Kairos SMTP is working end-to-end.',
    })
    return NextResponse.json({ data: { sent: true, to: testTo } })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: detail }, { status: 502 })
  }
}
