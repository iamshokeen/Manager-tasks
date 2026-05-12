// src/app/api/admin/approvals/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { render } from '@react-email/render'
import { sendEmail } from '@/lib/mailer'
import { AccessApproved } from '../../../../../../../emails/access-approved'
import type { Role } from '@prisma/client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kairos-git-main-sakshamshokeen-5950s-projects.vercel.app'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.approvalStatus !== 'PENDING') {
      return NextResponse.json({ error: 'User is not in PENDING status' }, { status: 400 })
    }

    const body = await request.json() as { role: Role; workspaceId?: string }
    if (!body.role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'APPROVED',
        role: body.role,
        approvedBy: user.id,
        approvedAt: new Date(),
        isActive: true,
      },
    })

    if (body.workspaceId) {
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: body.workspaceId,
            userId: id,
          },
        },
        update: { role: body.role },
        create: {
          workspaceId: body.workspaceId,
          userId: id,
          role: body.role,
        },
      })
    }

    try {
      const html = await render(AccessApproved({ name: target.name, appUrl: APP_URL }))
      await sendEmail({
        to: target.email,
        subject: 'Your access has been approved',
        html,
      })
    } catch {
      // Email failure is non-fatal; log is still written
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'user_approved',
        metadata: { userId: id, role: body.role },
      },
    })

    return NextResponse.json({ user: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
