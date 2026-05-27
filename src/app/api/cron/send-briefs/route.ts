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
import { signPdfDownloadToken } from '@/app/api/reports/member/[userId]/pdf/route'
import { istParts } from '@/lib/ist-dates'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://kairos-ai-hq.vercel.app'
}

function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

// Returns true when the recipient's configured fire-time is between
// 0 and 60 minutes before `now` (in IST). Vercel free-tier cron arrives
// hourly, so the whole hour after the user's chosen HH:MM counts as
// "fire window".
const IST_OFFSET_MS = 5.5 * 3600_000
function shouldFireNow(
  now: Date,
  schedule: string,
  hour: number,
  minute: number,
  weekday: number,
): boolean {
  if (schedule === 'off') return false
  const p = istParts(now)
  if (schedule === 'weekly' && p.dow !== weekday) return false
  const istMidnightUtcMs = Date.UTC(p.y, p.m, p.d) - IST_OFFSET_MS
  const fireAtMs = istMidnightUtcMs + hour * 3600_000 + minute * 60_000
  const diffMin = (now.getTime() - fireAtMs) / 60_000
  return diffMin >= 0 && diffMin < 60
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
    if (!shouldFireNow(now, u.reportSchedule, u.reportHourIst, u.reportMinuteIst, u.reportWeekday)) continue

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
          console.error('[cron/send-briefs] email', u.id, e)
          result.email = { ok: false, error: 'send failed' }
        }
      }
    }

    if (wantWA) {
      const phoneRaw = u.reportPhone ?? u.phone
      const phoneDigits = phoneRaw ? normalizePhoneDigits(phoneRaw) : null
      if (!phoneDigits) {
        result.whatsapp = { ok: false, error: 'no recipient phone' }
      } else {
        const token = await signPdfDownloadToken(u.id, dateStr)
        const pdfLink = `${appUrl()}/api/reports/member/${u.id}/pdf?token=${token}`
        const message = `${renderWhatsAppSummary(report, undefined)}\n\n📎 Full PDF: ${pdfLink}`
        const link = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
        // Note: this is the open-link, not an actual send. Without a paid
        // WhatsApp Business API we cannot push messages from the server,
        // so we log + persist the link for the manager to pick up. For now
        // we just log; a future hook can email the manager the link.
        console.log(`[cron/send-briefs] whatsapp link for ${u.name}: ${link}`)
        result.whatsapp = { ok: true, to: phoneDigits, link }
      }
    }

    dispatched.push(result)
  }

  return NextResponse.json({ now: now.toISOString(), dispatched })
}
