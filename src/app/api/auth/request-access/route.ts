// src/app/api/auth/request-access/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { prisma } from '@/lib/prisma'
import { generateOTP, hashOTP } from '@/lib/auth'
import { checkRateLimit, getRateLimitIp } from '@/lib/rate-limit'
import { VerifyEmail } from '../../../../../emails/verify-email'
import { Role } from '@prisma/client'
import React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

function mapRoleStringToEnum(roleRequested: string): Role {
  switch (roleRequested) {
    case 'Manager':
      return Role.MANAGER
    case 'Senior IC':
      return Role.SENIOR_IC
    case 'Direct Report':
      return Role.DIRECT_REPORT
    case 'Exec Viewer':
      return Role.EXEC_VIEWER
    default:
      return Role.DIRECT_REPORT
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
    let body: { name?: string; email?: string; roleRequested?: string; teamName?: string; message?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { name, email, roleRequested, teamName, message } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    const emailLower = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }
    if (!roleRequested || typeof roleRequested !== 'string' || roleRequested.trim() === '') {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 })
    }
    if (!teamName || typeof teamName !== 'string' || teamName.trim() === '') {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = await hashOTP(otp)
    const verifyExpiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Map role string to enum
    const role = mapRoleStringToEnum(roleRequested.trim())

    // Create user
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        role,
        approvalStatus: 'PENDING',
        emailVerified: false,
        isActive: true,
        verifyToken: otpHash,
        verifyExpiry,
      },
    })

    // Send verification email
    const html = await render(React.createElement(VerifyEmail, { name: name.trim(), otp }))
    await resend.emails.send({
      from: 'Lohono <noreply@lohono.com>',
      to: emailLower,
      subject: 'Verify your email — Lohono Command Center',
      html,
    })

    return NextResponse.json({ message: 'Check your email for a verification code.' }, { status: 200 })
  } catch (err) {
    console.error('[request-access] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
