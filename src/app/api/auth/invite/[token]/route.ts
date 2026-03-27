// src/app/api/auth/invite/[token]/route.ts
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
        workspace: {
          select: { id: true, name: true },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 404 })
    }

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          workspaceId: invite.workspaceId,
          workspace: invite.workspace
            ? { name: invite.workspace.name }
            : null,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[invite/token] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
