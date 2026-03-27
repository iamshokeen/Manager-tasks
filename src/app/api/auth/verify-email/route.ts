// src/app/api/auth/verify-email/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { prisma } from '@/lib/prisma'
import { verifyOTP } from '@/lib/auth'
import { checkRateLimit, getRateLimitIp } from '@/lib/rate-limit'
import { AccessRequestAdmin } from '../../../../../emails/access-request-admin'
import React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

// Human-readable role label for admin notification email
function roleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':  return 'Super Admin'
    case 'MANAGER':      return 'Manager'
    case 'SENIOR_IC':    return 'Senior IC'
    case 'DIRECT_REPORT':return 'Direct Report'
    case 'EXEC_VIEWER':  return 'Exec Viewer'
    case 'GUEST':        return 'Guest'
    default:             return role
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = getRateLimitIp(req)
    const rl = checkRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // Parse body
    let body: { email?: string; otp?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { email, otp } = body

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    if (!otp || typeof otp !== 'string' || otp.trim() === '') {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()

    // Find user
    const user = await prisma.user.findUnique({ where: { email: emailLower } })

    // Generic error to avoid user enumeration
    const invalidMsg = 'Invalid or expired verification code.'

    if (!user) {
      return NextResponse.json({ error: invalidMsg }, { status: 400 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified.' }, { status: 400 })
    }
    if (!user.verifyToken || !user.verifyExpiry) {
      return NextResponse.json({ error: invalidMsg }, { status: 400 })
    }
    if (user.verifyExpiry < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired. Please request access again.' }, { status: 400 })
    }

    // Verify OTP
    const valid = await verifyOTP(otp.trim(), user.verifyToken)
    if (!valid) {
      return NextResponse.json({ error: invalidMsg }, { status: 400 })
    }

    // Mark email verified, clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verifyToken: null,
        verifyExpiry: null,
      },
    })

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lohono.com'

    if (adminEmail) {
      try {
        const html = await render(
          React.createElement(AccessRequestAdmin, {
            requesterName: user.name,
            requesterEmail: user.email,
            roleRequested: roleLabel(user.role),
            teamName: 'Not specified',
            appUrl,
          })
        )
        await resend.emails.send({
          from: 'Lohono <noreply@lohono.com>',
          to: adminEmail,
          subject: `New access request from ${user.name}`,
          html,
        })
      } catch (emailErr) {
        // Don't fail the request if the admin email fails — log and continue
        console.error('[verify-email] Failed to send admin notification:', emailErr)
      }
    }

    return NextResponse.json(
      { message: 'Request submitted. You will be notified when approved.' },
      { status: 200 }
    )
  } catch (err) {
    console.error('[verify-email] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
