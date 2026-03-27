// src/app/api/auth/verify-login/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTP, signJWT, setAuthCookie } from '@/lib/auth'
import { checkOtpVerifyLimit, resetOtpVerifyLimit, getRateLimitIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // Tighter rate limit for OTP verify — separate from login request limit
    const ip = getRateLimitIp(req)
    const rl = checkOtpVerifyLimit(ip)
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
      return NextResponse.json({ error: 'Login code is required.' }, { status: 400 })
    }

    const emailLower = email.trim().toLowerCase()
    const invalidMsg = 'Invalid or expired code.'

    // Find user
    const user = await prisma.user.findUnique({ where: { email: emailLower } })

    if (!user) {
      return NextResponse.json({ error: invalidMsg }, { status: 401 })
    }
    if (!user.verifyToken || !user.verifyExpiry) {
      return NextResponse.json({ error: invalidMsg }, { status: 401 })
    }
    if (user.verifyExpiry < new Date()) {
      return NextResponse.json({ error: invalidMsg }, { status: 401 })
    }

    // Verify OTP
    const valid = await verifyOTP(otp.trim(), user.verifyToken)
    if (!valid) {
      return NextResponse.json({ error: invalidMsg }, { status: 401 })
    }

    // Clear OTP verify rate limit on success
    resetOtpVerifyLimit(ip)

    // Sign JWT and set cookie
    const token = await signJWT({ userId: user.id, email: user.email, role: user.role })
    await setAuthCookie(token)

    // Update lastLoginAt and clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        verifyToken: null,
        verifyExpiry: null,
      },
    })

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[verify-login] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
