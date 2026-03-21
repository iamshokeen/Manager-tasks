// src/app/api/cron/reminders/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { isDueSoon, isOverdue, formatDate } from '@/lib/utils'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tasks = await prisma.task.findMany({
    where: { status: { not: 'done' }, dueDate: { not: null } },
    include: { assignee: { select: { name: true } } },
  })

  const to = process.env.REPORT_EMAIL_TO
  if (!to) return NextResponse.json({ error: 'No email configured' }, { status: 500 })

  const overdue = tasks.filter(t => isOverdue(t.dueDate))
  const dueSoon = tasks.filter(t => isDueSoon(t.dueDate))

  if (overdue.length > 0 || dueSoon.length > 0) {
    const resend = getResend()
    await resend.emails.send({
      from: 'Lohono CMD <onboarding@resend.dev>',
      to,
      subject: `Task Alert — ${overdue.length} overdue, ${dueSoon.length} due soon`,
      html: buildReminderHtml(overdue, dueSoon),
    })
  }

  return NextResponse.json({ overdue: overdue.length, dueSoon: dueSoon.length })
}

function buildReminderHtml(overdue: any[], dueSoon: any[]): string {
  const row = (t: any, urgent: boolean) =>
    `<tr>
      <td style="padding:6px 8px;font-size:13px;${urgent ? 'color:#EF4444' : ''}">${t.title}</td>
      <td style="padding:6px 8px;font-size:12px;color:#6B7280">${t.assignee?.name ?? 'Self'}</td>
      <td style="padding:6px 8px;font-size:12px;font-family:monospace">${t.dueDate ? formatDate(t.dueDate) : '—'}</td>
    </tr>`

  return `<!DOCTYPE html><html><body style="background:#0A0B0F;color:#E8E9ED;font-family:'DM Sans',sans-serif;padding:32px;max-width:600px;margin:0 auto;">
  <div style="border-bottom:1px solid #1E2028;padding-bottom:16px;margin-bottom:24px;">
    <span style="color:#C9A84C;font-weight:700;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Lohono CMD — Task Reminders</span>
  </div>
  ${overdue.length > 0 ? `<h3 style="color:#EF4444;font-size:13px;margin-bottom:8px;">Overdue (${overdue.length})</h3><table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${overdue.map(t => row(t, true)).join('')}</table>` : ''}
  ${dueSoon.length > 0 ? `<h3 style="color:#F59E0B;font-size:13px;margin-bottom:8px;">Due in 24h (${dueSoon.length})</h3><table style="width:100%;border-collapse:collapse;">${dueSoon.map(t => row(t, false)).join('')}</table>` : ''}
  <br><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" style="color:#C9A84C;font-size:12px;">View all tasks →</a>
</body></html>`
}
