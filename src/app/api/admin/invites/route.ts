// src/app/api/admin/invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { render } from '@react-email/render'
import { sendEmail } from '@/lib/mailer'
import { WorkspaceInvite } from '../../../../../emails/workspace-invite'
import type { Role } from '@prisma/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lohono-command-center.vercel.app' // KAIROS-TODO: Update fallback URL

// ─── GET: list all invites ────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const invites = await prisma.invite.findMany({
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        sentBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: invites })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST: create invite ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      email: string
      role: Role
      workspaceId?: string
      expiresInDays?: number
    }

    if (!body.email || !body.role) {
      return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
    }

    const expiresInDays = body.expiresInDays ?? 2
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    const token = crypto.randomUUID()

    const invite = await prisma.invite.create({
      data: {
        email: body.email,
        role: body.role,
        workspaceId: body.workspaceId ?? null,
        token,
        expiresAt,
        sentById: user.id,
      },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        sentBy: { select: { id: true, name: true, email: true } },
      },
    })

    const workspaceName = invite.workspace?.name ?? 'Kairos'
    const acceptUrl = `${APP_URL}/auth/accept-invite?token=${token}`

    try {
      const html = await render(
        WorkspaceInvite({
          inviterName: user.name,
          workspaceName,
          role: body.role,
          acceptUrl,
          expiresAt: expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        })
      )
      await sendEmail({
        to: body.email,
        subject: `You've been invited to ${workspaceName}`,
        html,
      })
    } catch {
      // Email failure is non-fatal; invite record is already created
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'invite_sent',
        metadata: { inviteId: invite.id, email: body.email, role: body.role },
      },
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH: resend or revoke invite ──────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as { inviteId: string; action: 'resend' | 'revoke' }

    if (!body.inviteId || !body.action) {
      return NextResponse.json({ error: 'inviteId and action are required' }, { status: 400 })
    }

    const existing = await prisma.invite.findUnique({
      where: { id: body.inviteId },
      include: {
        workspace: { select: { id: true, name: true } },
        sentBy: { select: { id: true, name: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

    if (body.action === 'revoke') {
      const invite = await prisma.invite.update({
        where: { id: body.inviteId },
        data: { status: 'EXPIRED' },
      })

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'invite_revoked',
          metadata: { inviteId: body.inviteId },
        },
      })

      return NextResponse.json({ invite })
    }

    if (body.action === 'resend') {
      const newToken = crypto.randomUUID()
      const newExpiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

      const invite = await prisma.invite.update({
        where: { id: body.inviteId },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
          status: 'PENDING',
        },
        include: {
          workspace: { select: { id: true, name: true, slug: true } },
          sentBy: { select: { id: true, name: true, email: true } },
        },
      })

      const workspaceName = invite.workspace?.name ?? 'Kairos'
      const acceptUrl = `${APP_URL}/auth/accept-invite?token=${newToken}`

      try {
        const html = await render(
          WorkspaceInvite({
            inviterName: user.name,
            workspaceName,
            role: invite.role,
            acceptUrl,
            expiresAt: newExpiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
          })
        )
        await sendEmail({
          to: invite.email,
          subject: `You've been invited to ${workspaceName}`,
          html,
        })
      } catch {
        // Email failure is non-fatal
      }

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'invite_resent',
          metadata: { inviteId: body.inviteId, email: invite.email },
        },
      })

      return NextResponse.json({ invite })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
