// src/app/api/tasks/[id]/email/route.ts
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { getTask, logActivity } from '@/lib/services/tasks'
import { formatDate } from '@/lib/utils'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { to, subject, body } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
  }

  const task = await getTask(id)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  try {
    await sendEmail({
      to,
      subject,
      html: buildTaskEmailHtml(task, body),
    })

    await logActivity(id, 'email_sent', undefined, to, `Email sent: ${subject}`)

    return NextResponse.json({ message: 'Email sent' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

function buildTaskEmailHtml(task: any, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0A0B0F;color:#E8E9ED;font-family:'DM Sans',sans-serif;padding:32px;max-width:600px;margin:0 auto;">
  <div style="border-bottom:1px solid #1E2028;padding-bottom:16px;margin-bottom:24px;">
    <span style="color:#C9A84C;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Lohono Command Center</span>
  </div>
  <p style="font-size:15px;line-height:1.6;margin-bottom:24px;">${body}</p>
  <div style="background:#111318;border:1px solid #1E2028;border-radius:8px;padding:16px;margin-bottom:24px;">
    <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Task Context</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${task.title}</div>
    <div style="font-size:12px;color:#6B7280;">
      Status: ${task.status} · Priority: ${task.priority}
      ${task.dueDate ? ` · Due: ${formatDate(task.dueDate)}` : ''}
    </div>
  </div>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}" style="color:#C9A84C;font-size:12px;">View task →</a>
</body>
</html>`
}
