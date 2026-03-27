// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { prisma } from '@/lib/prisma'
import { generateOTP, hashOTP } from '@/lib/auth'
import { checkRateLimit, getRateLimitIp } from '@/lib/rate-limit'
import { LoginOtp } from '../../../../../emails/login-otp'
import React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    let body: { email?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { email } = body

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()

    // Find user — keep error message deliberately vague to prevent enumeration
    const genericError = 'Account not found or not yet approved.'

    const user = await prisma.user.findUnique({ where: { email: emailLower } })

    if (
      !user ||
      !user.emailVerified ||
      user.approvalStatus !== 'APPROVED' ||
      !user.isActive
    ) {
      return NextResponse.json({ error: genericError }, { status: 401 })
    }

    // Generate OTP (10 min expiry)
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const verifyExpiry = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: otpHash,
        verifyExpiry,
      },
    })

    // Send login OTP email
    const html = await render(React.createElement(LoginOtp, { name: user.name, otp }))
    await resend.emails.send({
      from: 'Lohono <noreply@lohono.com>',
      to: emailLower,
      subject: 'Your Lohono Command Center login code',
      html,
    })

    return NextResponse.json({ message: 'Login code sent.' }, { status: 200 })
  } catch (err) {
    console.error('[login] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
