// src/lib/services/member-report-email.ts
//
// Render a MemberReport as inline-styled HTML suitable for email clients.
// Mirrors the visual language of the print page but with table-based
// layout so Gmail / Outlook / Apple Mail render it correctly.

import type { MemberReport, MemberReportTask } from './member-report'

const STAGE_HEX: Record<string, string> = {
  todo: '#a9b4b9',
  in_progress: '#0053db',
  review: '#7c3aed',
  blocked: '#c62828',
  done: '#2e7d32',
}

const PRIORITY_HEX: Record<string, string> = {
  urgent: '#9f403d', critical: '#9f403d', high: '#865400',
  medium: '#f8a010', low: '#a9b4b9',
}

function fmtIstDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

function fmtIstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function statSpan(label: string, value: number, color: string): string {
  return `
    <td align="center" valign="top" style="padding: 10px 8px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px;">
      <div style="font-size: 9px; font-weight: 800; color: #666; letter-spacing: 0.12em; text-transform: uppercase;">${escape(label)}</div>
      <div style="font-size: 22px; font-weight: 800; color: ${color}; font-family: ui-monospace, 'SF Mono', Consolas, monospace; margin-top: 4px;">${value}</div>
    </td>
  `.trim()
}

function sectionHeader(title: string, accent?: string): string {
  const c = accent ?? '#111'
  return `
    <h2 style="font-size: 11px; font-weight: 800; color: ${c}; letter-spacing: 0.12em; text-transform: uppercase; margin: 22px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid ${c};">
      ${escape(title)}
    </h2>
  `.trim()
}

function taskRow(t: MemberReportTask, opts?: { overdueAnchor?: string }): string {
  const overdueAnchor = opts?.overdueAnchor
  const start = t.startDate ?? t.endDate ?? t.dueDate
  const end = t.endDate ?? t.dueDate ?? t.startDate
  const schedule = !start && !end
    ? '—'
    : (start === end || !start || !end)
    ? fmtIstDate(end ?? start!)
    : `${fmtIstDate(start)} → ${fmtIstDate(end)}`
  const stageColor = STAGE_HEX[t.status] ?? '#a9b4b9'
  const priorityColor = PRIORITY_HEX[t.priority] ?? '#a9b4b9'
  let lateBadge = ''
  if (overdueAnchor && end) {
    const days = Math.max(1, Math.round((new Date(overdueAnchor).getTime() - new Date(end).getTime()) / 86_400_000))
    lateBadge = `<span style="color: #c62828; font-weight: 800; margin-left: 6px;">· ${days}d late</span>`
  }
  return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; background: ${overdueAnchor ? '#fff7f7' : '#ffffff'};">
        <div style="font-weight: 600; color: #111; font-size: 12px;">${escape(t.title)}</div>
        ${t.projectTitle ? `<div style="font-size: 10px; color: #777;">${escape(t.projectTitle)}</div>` : ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; vertical-align: top;">
        <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 2px; background: ${stageColor}20; color: ${stageColor};">
          ${escape(t.status.replace('_', ' '))}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; vertical-align: top;">
        <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${priorityColor};">● ${escape(t.priority)}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; vertical-align: top;">
        <span style="font-size: 10px; font-family: ui-monospace, 'SF Mono', Consolas, monospace; color: ${overdueAnchor ? '#c62828' : '#444'};">
          ${escape(schedule)}${lateBadge}
        </span>
      </td>
    </tr>
  `.trim()
}

function taskTable(rows: MemberReportTask[], opts?: { overdueAnchor?: string }): string {
  if (rows.length === 0) return '<p style="font-size: 11px; color: #888; font-style: italic; margin: 4px 0;">None.</p>'
  return `
    <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="background: ${opts?.overdueAnchor ? '#fdecec' : '#f5f6f8'}; text-align: left;">
          <th style="padding: 6px 8px; font-size: 9px; font-weight: 800; color: #555; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #e0e0e0;">Task</th>
          <th style="padding: 6px 8px; font-size: 9px; font-weight: 800; color: #555; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #e0e0e0; width: 90px;">Stage</th>
          <th style="padding: 6px 8px; font-size: 9px; font-weight: 800; color: #555; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #e0e0e0; width: 70px;">Priority</th>
          <th style="padding: 6px 8px; font-size: 9px; font-weight: 800; color: #555; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #e0e0e0; width: 140px;">${opts?.overdueAnchor ? 'Was Due' : 'Schedule'}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => taskRow(r, opts)).join('\n')}
      </tbody>
    </table>
  `.trim()
}

export function renderMemberReportEmail(report: MemberReport, opts?: { briefUrl?: string }): {
  subject: string
  html: string
  text: string
} {
  const subject = `Kairos Daily Brief — ${report.member.name} — ${fmtIstDate(report.date)}`
  const subtitle = [report.member.title, report.member.department].filter(Boolean).join(' · ')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111;">
  <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; background: #f4f6f8; padding: 24px 0;">
    <tr><td align="center">
      <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 720px; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">

        <!-- Header -->
        <tr><td style="padding: 24px 28px 14px 28px; border-bottom: 2px solid #111;">
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.18em; color: #0053db; text-transform: uppercase;">Kairos · Tactical Daily Brief</div>
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #111; margin: 6px 0 4px 0;">${escape(report.member.name)}</h1>
          <div style="font-size: 12px; color: #555;">${escape(subtitle || report.member.email)}</div>
          <div style="font-size: 10px; font-family: ui-monospace, 'SF Mono', Consolas, monospace; color: #777; letter-spacing: 0.08em; margin-top: 6px;">
            ${escape(fmtIstDate(report.date))} · IST
          </div>
        </td></tr>

        <!-- Stat tiles -->
        <tr><td style="padding: 18px 28px 0 28px;">
          <table cellspacing="6" cellpadding="0" border="0" style="width: 100%;">
            <tr>
              ${statSpan('In Progress', report.counts.inProgress, '#865400')}
              ${statSpan('Overdue', report.counts.overdue, report.counts.overdue > 0 ? '#c62828' : '#a9b4b9')}
              ${statSpan('Done Today', report.counts.completedToday, '#2e7d32')}
              ${statSpan('Blocked', report.counts.blocked, '#c62828')}
              ${statSpan('Follow-ups', report.counts.followUpsActionedToday, '#7c3aed')}
              ${statSpan('New Today', report.counts.tasksCreatedToday, '#0053db')}
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding: 4px 28px 28px 28px;">

          ${sectionHeader(`In Progress (${report.inProgress.length})`, '#865400')}
          ${taskTable(report.inProgress)}

          ${sectionHeader(`Overdue (${report.overdue.length})`, '#c62828')}
          ${taskTable(report.overdue, { overdueAnchor: report.date })}

          ${sectionHeader(`Done Today (${report.completedToday.length})`, '#2e7d32')}
          ${
            report.completedToday.length === 0
              ? '<p style="font-size: 11px; color: #888; font-style: italic; margin: 4px 0;">No tasks marked done today.</p>'
              : `<ul style="list-style: none; padding: 0; margin: 0;">${report.completedToday.map(t => `
                <li style="padding: 6px 0; border-bottom: 1px solid #eee; font-size: 12px; color: #333;">
                  <span style="color: #2e7d32; font-weight: 800; margin-right: 8px;">✓</span>
                  <span style="text-decoration: line-through;">${escape(t.title)}</span>
                  ${t.completedAt ? `<span style="font-size: 10px; color: #777; font-family: ui-monospace, 'SF Mono', Consolas, monospace; margin-left: 8px;">${escape(fmtIstTime(t.completedAt))}</span>` : ''}
                </li>
              `).join('\n')}</ul>`
          }

          ${sectionHeader(`Blocked / In Review (${report.blocked.length})`, '#c62828')}
          ${taskTable(report.blocked)}

          ${sectionHeader(`Follow-ups Actioned Today (${report.followUpsActionedToday.length})`, '#7c3aed')}
          ${
            report.followUpsActionedToday.length === 0
              ? '<p style="font-size: 11px; color: #888; font-style: italic; margin: 4px 0;">No follow-ups touched today.</p>'
              : `<ul style="list-style: none; padding: 0; margin: 0;">${report.followUpsActionedToday.map(f => `
                <li style="padding: 6px 0; border-bottom: 1px solid #eee; font-size: 12px; color: #222;">
                  <strong>${escape(f.title)}</strong>
                  <span style="color: #777;"> · ${escape(f.contactName)}</span>
                  <span style="float: right; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #7c3aed;">${escape(f.status)}</span>
                </li>
              `).join('\n')}</ul>`
          }

          ${sectionHeader(`New Tasks Today (${report.tasksCreatedToday.length})`, '#0053db')}
          ${taskTable(report.tasksCreatedToday)}

          ${sectionHeader(`Comments Updated Today (${report.commentsToday.length})`)}
          ${
            report.commentsToday.length === 0
              ? '<p style="font-size: 11px; color: #888; font-style: italic; margin: 4px 0;">No comments posted today.</p>'
              : report.commentsToday.map(c => `
                <div style="border-left: 3px solid #0053db; background: #f7f8fa; padding: 8px 12px; margin-bottom: 8px; border-radius: 2px;">
                  <div style="font-size: 11px; font-weight: 700; color: #111; margin-bottom: 4px;">${escape(c.taskTitle)}</div>
                  <div style="font-size: 12px; color: #333; line-height: 1.5;">${sanitizeHtml(c.note)}</div>
                  <div style="font-size: 10px; color: #777; font-family: ui-monospace, 'SF Mono', Consolas, monospace; margin-top: 6px;">
                    ${escape(c.authorName ?? 'System')} · ${escape(fmtIstTime(c.createdAt))}
                  </div>
                </div>
              `).join('\n')
          }

          ${opts?.briefUrl ? `
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center;">
              <a href="${escape(opts.briefUrl)}" style="display: inline-block; padding: 10px 18px; background: #0053db; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 4px;">
                View Full Brief
              </a>
            </div>
          ` : ''}

        </td></tr>

        <tr><td style="padding: 14px 28px; text-align: center; font-size: 9px; color: #888; letter-spacing: 0.08em; text-transform: uppercase; font-family: ui-monospace, 'SF Mono', Consolas, monospace; border-top: 1px solid #ddd;">
          Generated by Kairos · Confidential
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()

  const text = renderPlainText(report, opts?.briefUrl)
  return { subject, html, text }
}

// Plain-text fallback for clients that strip HTML and for WhatsApp.
function renderPlainText(report: MemberReport, briefUrl?: string): string {
  const lines: string[] = []
  lines.push(`Kairos Daily Brief — ${report.member.name}`)
  lines.push(`${fmtIstDate(report.date)} · IST`)
  lines.push('')
  lines.push(`  ${report.counts.inProgress} in progress · ${report.counts.overdue} overdue · ${report.counts.completedToday} done today`)
  lines.push(`  ${report.counts.blocked} blocked · ${report.counts.followUpsActionedToday} follow-ups · ${report.counts.tasksCreatedToday} new`)
  lines.push('')
  if (report.overdue.length > 0) {
    lines.push(`OVERDUE (${report.overdue.length})`)
    for (const t of report.overdue.slice(0, 10)) lines.push(`  • ${t.title}`)
    if (report.overdue.length > 10) lines.push(`  …and ${report.overdue.length - 10} more`)
    lines.push('')
  }
  if (report.inProgress.length > 0) {
    lines.push(`IN PROGRESS (${report.inProgress.length})`)
    for (const t of report.inProgress.slice(0, 10)) lines.push(`  • ${t.title}`)
    if (report.inProgress.length > 10) lines.push(`  …and ${report.inProgress.length - 10} more`)
    lines.push('')
  }
  if (report.completedToday.length > 0) {
    lines.push(`DONE TODAY (${report.completedToday.length})`)
    for (const t of report.completedToday) lines.push(`  ✓ ${t.title}`)
    lines.push('')
  }
  if (briefUrl) {
    lines.push(`Full brief: ${briefUrl}`)
  }
  return lines.join('\n')
}

// Compact summary for WhatsApp — kept short so the deeplink stays clickable.
export function renderWhatsAppSummary(report: MemberReport, briefUrl?: string): string {
  const lines: string[] = []
  lines.push(`*Kairos Daily Brief — ${report.member.name}*`)
  lines.push(`_${fmtIstDate(report.date)}_`)
  lines.push('')
  lines.push(`📊 ${report.counts.inProgress} in progress · ${report.counts.overdue} overdue · ${report.counts.completedToday} done today`)
  lines.push(`🚧 ${report.counts.blocked} blocked · 🔁 ${report.counts.followUpsActionedToday} follow-ups · ✨ ${report.counts.tasksCreatedToday} new`)
  if (report.overdue.length > 0) {
    lines.push('')
    lines.push(`*Overdue (${report.overdue.length}):*`)
    for (const t of report.overdue.slice(0, 5)) lines.push(`• ${t.title}`)
    if (report.overdue.length > 5) lines.push(`…+${report.overdue.length - 5} more`)
  }
  if (briefUrl) {
    lines.push('')
    lines.push(`Full brief: ${briefUrl}`)
  }
  return lines.join('\n')
}
