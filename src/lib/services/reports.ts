// src/lib/services/reports.ts
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'
import { getCurrentWeekPeriod, getCurrentMonthPeriod, formatPeriod, formatCrore } from '@/lib/format'

export async function generateWeeklyReport() {
  const period = getCurrentWeekPeriod()
  const { startOfWeek } = await import('date-fns')
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const [openTaskCount, completedTasks, overdueCount, teamMembers, metrics, tasksCreated] = await Promise.all([
    prisma.task.count({ where: { status: { not: 'done' } } }),
    prisma.task.findMany({
      where: { status: 'done', completedAt: { gte: weekStart } },
      include: { assignee: { select: { name: true } } },
    }),
    prisma.task.count({ where: { status: { not: 'done' }, dueDate: { lt: new Date() } } }),
    prisma.teamMember.findMany({ where: { status: 'active' } }),
    prisma.numberEntry.findMany({ where: { period: getCurrentMonthPeriod() } }),
    prisma.task.count({ where: { createdAt: { gte: weekStart } } }),
  ])

  const data = {
    period,
    openTasks: openTaskCount,
    completedThisWeek: completedTasks.length,
    completedTasks: completedTasks.map(t => ({ title: t.title, assignee: t.assignee?.name })),
    overdueTasks: overdueCount,
    activeTeamCount: teamMembers.length,
    metrics: metrics.reduce((acc, m) => ({ ...acc, [m.metric]: m.value }), {} as Record<string, number>),
    tasksCreated,
  }

  return prisma.report.upsert({
    where: { type_period: { type: 'weekly', period } },
    update: { data },
    create: { type: 'weekly', period, data },
  })
}

export async function emailReport(reportId: string, to?: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } })
  if (!report) throw new Error('Report not found')

  const recipient = to ?? process.env.REPORT_EMAIL_TO
  if (!recipient) throw new Error('No recipient email configured')

  const data = report.data as any

  await sendEmail({
    to: recipient,
    subject: `Weekly Report — ${formatPeriod(report.period)}`,
    html: buildReportHtml(data),
  })

  await prisma.report.update({ where: { id: reportId }, data: { emailedAt: new Date() } })
}

function buildReportHtml(data: any): string {
  return `
<!DOCTYPE html>
<html>
<body style="background:#0A0B0F;color:#E8E9ED;font-family:'DM Sans',sans-serif;padding:32px;max-width:600px;margin:0 auto;">
  <div style="border-bottom:1px solid #1E2028;padding-bottom:16px;margin-bottom:24px;">
    <span style="color:#C9A84C;font-weight:700;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Lohono CMD — Weekly Report</span>
    <div style="font-size:12px;color:#6B7280;margin-top:4px;">${formatPeriod(data.period)}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
    <div style="background:#111318;border:1px solid #1E2028;border-radius:8px;padding:14px;">
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;margin-bottom:4px;">Completed</div>
      <div style="font-size:24px;font-weight:700;color:#10B981;">${data.completedThisWeek}</div>
    </div>
    <div style="background:#111318;border:1px solid #1E2028;border-radius:8px;padding:14px;">
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;margin-bottom:4px;">Overdue</div>
      <div style="font-size:24px;font-weight:700;color:#EF4444;">${data.overdueTasks}</div>
    </div>
  </div>
  ${data.metrics && data.metrics.checkin_revenue ? `
  <div style="background:#111318;border:1px solid #1E2028;border-radius:8px;padding:14px;margin-bottom:16px;">
    <div style="font-size:11px;color:#6B7280;margin-bottom:4px;">Check-in Revenue</div>
    <div style="font-size:18px;font-weight:700;color:#C9A84C;">${formatCrore(data.metrics.checkin_revenue)} <span style="font-size:12px;color:#6B7280;">of ₹85 Cr</span></div>
  </div>` : ''}
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/reports" style="color:#C9A84C;font-size:12px;">View full report →</a>
</body>
</html>`
}
