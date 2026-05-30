// src/app/api/cron/send-briefs/route.ts
//
// Hourly Vercel cron. For every active user whose schedule lands inside
// the current IST window (hour ± 30 min and weekday match for weekly),
// builds today's brief and dispatches it through the channels they
// configured.
//
// Authorization: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMemberReport } from '@/lib/services/member-report'
import { renderMemberReportEmail, renderWhatsAppSummary } from '@/lib/services/member-report-email'
import { renderMemberReportPdf } from '@/lib/services/member-report-pdf'
import { sendEmail } from '@/lib/mailer'
import { mintBriefShortlink } from '@/lib/services/brief-shortlink'
import { istParts } from '@/lib/ist-dates'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairos-ai-hq.vercel.app'
}

function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

// Vercel Hobby plan only allows one cron run per day, so we fire this
// route once at 08:00 IST and dispatch every brief that's due today.
// The per-user HH:MM picker stays in Settings for a future Pro upgrade
// (Vercel Pro supports per-minute crons) but is ignored at runtime.
function shouldFireToday(
  now: Date,
  schedule: string,
  weekday: number,
): boolean {
  if (schedule === 'off') return false
  if (schedule === 'daily') return true
  if (schedule === 'weekly') return istParts(now).dow === weekday
  return false
}

interface DispatchResult {
  userId: string
  name: string
  email?: { ok: boolean; to?: string; error?: string }
  whatsapp?: { ok: boolean; to?: string; link?: string; error?: string }
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const candidates = await prisma.user.findMany({
    where: {
      isActive: true,
      reportSchedule: { in: ['daily', 'weekly'] },
      reportChannels: { in: ['email', 'whatsapp', 'both'] },
    },
    select: {
      id: true, name: true, email: true, phone: true,
      reportEmail: true, reportPhone: true,
      reportSchedule: true, reportHourIst: true, reportMinuteIst: true,
      reportWeekday: true, reportChannels: true,
    },
  })

  const dispatched: DispatchResult[] = []

  for (const u of candidates) {
    if (!shouldFireToday(now, u.reportSchedule, u.reportWeekday)) continue

    let report
    try {
      report = await getMemberReport(u.id, now)
    } catch (e) {
      dispatched.push({ userId: u.id, name: u.name, email: { ok: false, error: 'getMemberReport failed' }, whatsapp: { ok: false, error: 'skipped' } })
      console.error('[cron/send-briefs] getMemberReport', u.id, e)
      continue
    }
    if (!report) {
      dispatched.push({ userId: u.id, name: u.name, email: { ok: false, error: 'no report data' } })
      continue
    }

    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
    const briefUrl = `${appUrl()}/reports/print/${u.id}?date=${dateStr}&auto=0`
    const filename = `kairos-brief-${u.name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.pdf`

    let pdf: Buffer | null = null
    try { pdf = await renderMemberReportPdf(report) } catch (e) { console.error('[cron/send-briefs] pdf', u.id, e) }

    const result: DispatchResult = { userId: u.id, name: u.name }
    const wantEmail = u.reportChannels === 'email' || u.reportChannels === 'both'
    const wantWA    = u.reportChannels === 'whatsapp' || u.reportChannels === 'both'

    if (wantEmail) {
      const to = u.reportEmail ?? u.email
      if (!to) {
        result.email = { ok: false, error: 'no recipient email' }
      } else if (!pdf) {
        result.email = { ok: false, error: 'pdf render failed' }
      } else {
        try {
          const { subject, html, text } = renderMemberReportEmail(report, { briefUrl })
          await sendEmail({
            to, subject, html, text,
            attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
          })
          result.email = { ok: true, to }
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e)
          console.error('[cron/send-briefs] email', u.id, detail)
          result.email = { ok: false, error: detail }
        }
      }
    }

    if (wantWA) {
      const phoneRaw = u.reportPhone ?? u.phone
      const phoneDigits = phoneRaw ? normalizePhoneDigits(phoneRaw) : null
      if (!phoneDigits) {
        result.whatsapp = { ok: false, error: 'no recipient phone' }
      } else {
        const slug = await mintBriefShortlink(u.id, dateStr)
        const pdfLink = `${appUrl()}/r/${slug}`
        const message = `${renderWhatsAppSummary(report, undefined)}\n\nFull PDF: ${pdfLink}`
        const link = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
        // Note: this is the open-link, not an actual send. Without a paid
        // WhatsApp Business API we cannot push messages from the server,
        // so we log + persist the link for the manager to pick up.
        console.log(`[cron/send-briefs] whatsapp link for ${u.name}: ${link}`)
        result.whatsapp = { ok: true, to: phoneDigits, link }
      }
    }

    dispatched.push(result)
  }

  return NextResponse.json({ now: now.toISOString(), dispatched })
}
