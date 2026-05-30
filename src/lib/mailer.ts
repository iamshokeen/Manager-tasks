// src/lib/mailer.ts
import nodemailer from 'nodemailer'

function getTransporter() {
  // Gmail App Password is the source of truth in production. If creds are
  // missing we surface a clear error instead of swallowing nodemailer's
  // "Missing credentials for PLAIN" so the failure is debuggable.
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    throw new Error(
      'SMTP credentials not configured (set SMTP_USER and SMTP_PASS env vars in Vercel)',
    )
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  })
}

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}

export async function sendEmail(args: SendEmailArgs) {
  const transporter = getTransporter()
  try {
    await transporter.sendMail({
      from: `Kairos <${process.env.SMTP_USER}>`,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments: args.attachments,
    })
  } catch (e) {
    // Re-throw with the underlying nodemailer error attached so callers can
    // surface it instead of returning an opaque "Failed to send email".
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[mailer] sendMail failed', { to: args.to, error: msg })
    throw new Error(`SMTP send failed: ${msg}`)
  }
}

/**
 * Lightweight liveness check for the SMTP connection. Used by the admin
 * email-diag endpoint so the user can verify creds + reachability without
 * having to wire up a recipient and fire a real brief.
 */
export async function verifyTransport(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
