// src/lib/mailer.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}) {
  await transporter.sendMail({
    from: `Kairos <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
    attachments,
  })
}
