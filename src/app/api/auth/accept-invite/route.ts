// src/app/api/auth/accept-invite/route.ts
import { NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { prisma } from '@/lib/prisma'
import { signJWT, setAuthCookie } from '@/lib/auth'
import { sendEmail } from '@/lib/mailer'
import { AccessApproved } from '../../../../../emails/access-approved'
import React from 'react'

export async function POST(req: Request) {
  try {
    // Parse body
    let body: { token?: string; name?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { token, name } = body

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 })
    }

    // Look up invite
    const invite = await prisma.invite.findUnique({
      where: { token: token.trim() },
      include: {
        workspace: { select: { id: true, name: true } },
      },
    })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lohono.com'

    // Check if user with invite.email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } })

    if (existingUser) {
      if (existingUser.approvalStatus !== 'APPROVED' || !existingUser.isActive) {
        return NextResponse.json(
          { error: 'Your account is not yet approved.' },
          { status: 403 }
        )
      }

      // Approved existing user — add to workspace if applicable
      if (invite.workspaceId) {
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId: existingUser.id,
            },
          },
          create: {
            workspaceId: invite.workspaceId,
            userId: existingUser.id,
            role: invite.role,
          },
          update: {
            role: invite.role,
          },
        })
      }

      // Mark invite accepted
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: existingUser.id,
          action: 'invite_accepted',
          metadata: { inviteId: invite.id, email: invite.email },
        },
      })

      // Sign in the user
      const jwtToken = await signJWT({
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      })
      await setAuthCookie(jwtToken)

      // Update lastLoginAt
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastLoginAt: new Date() },
      })

      return NextResponse.json({ redirect: '/' }, { status: 200 })
    }

    // New user — create account
    const newUserName = (name && typeof name === 'string' && name.trim() !== '')
      ? name.trim()
      : 'New User'

    const newUser = await prisma.user.create({
      data: {
        email: invite.email,
        name: newUserName,
        role: invite.role,
        emailVerified: true,
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    })

    // Add to workspace if applicable
    if (invite.workspaceId) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: newUser.id,
          role: invite.role,
        },
      })
    }

    // Mark invite accepted
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: newUser.id,
        action: 'invite_accepted',
        metadata: { inviteId: invite.id, email: invite.email },
      },
    })

    // Send access-approved email
    try {
      const html = await render(
        React.createElement(AccessApproved, { name: newUserName, appUrl })
      )
      await sendEmail({
        to: invite.email,
        subject: 'Your Kairos access has been approved',
        html,
      })
    } catch (emailErr) {
      console.error('[accept-invite] Failed to send approval email:', emailErr)
    }

    // Sign in new user
    const jwtToken = await signJWT({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })
    await setAuthCookie(jwtToken)

    await prisma.user.update({
      where: { id: newUser.id },
      data: { lastLoginAt: new Date() },
    })

    return NextResponse.json({ redirect: '/' }, { status: 200 })
  } catch (err) {
    console.error('[accept-invite] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
