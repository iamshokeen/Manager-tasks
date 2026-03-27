// src/app/api/admin/approvals/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { AccessRejected } from '../../../../../../../emails/access-rejected'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'saksham.shokeen@lohono.com'

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

    const body = await request.json() as { reason?: string }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'REJECTED',
      },
    })

    try {
      const html = await render(
        AccessRejected({ name: target.name, reason: body.reason, adminEmail: ADMIN_EMAIL })
      )
      await resend.emails.send({
        from: `Lohono Command Center <${ADMIN_EMAIL}>`,
        to: target.email,
        subject: 'Update on your Lohono Command Center access request',
        html,
      })
    } catch {
      // Email failure is non-fatal
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'user_rejected',
        metadata: { userId: id, reason: body.reason ?? null },
      },
    })

    return NextResponse.json({ user: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
