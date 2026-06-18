// src/app/api/auth/invite/[token]/route.ts
//
// Public lookup of an invite by its token. The accept-invite page calls this
// to render the invitation card. Response is intentionally flat to match the
// page's `InviteData` shape.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || token.trim() === '') {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true } },
        sentBy: { select: { id: true, name: true } },
      },
    })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    // Does the invited address already have an account? Drives the
    // "sign-in to accept" vs "create account" branch on the page.
    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    })

    return NextResponse.json(
      {
        workspaceName: invite.workspace?.name ?? 'Kairos',
        email: invite.email,
        hasExistingAccount: !!existing,
        invitedBy: invite.sentBy?.name ?? undefined,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invite/token] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
