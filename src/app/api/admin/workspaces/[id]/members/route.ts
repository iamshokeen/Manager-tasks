// src/app/api/admin/workspaces/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

// ─── POST: add member to workspace ───────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: workspaceId } = await params

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await request.json() as { userId: string; role: Role }
    if (!body.userId || !body.role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: body.userId } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: body.userId,
        },
      },
      update: { role: body.role },
      create: {
        workspaceId,
        userId: body.userId,
        role: body.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'workspace_member_added',
        metadata: { workspaceId, targetUserId: body.userId, role: body.role },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE: remove member from workspace ────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: workspaceId } = await params

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await request.json() as { userId: string }
    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: body.userId,
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Member not found in this workspace' }, { status: 404 })
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: body.userId,
        },
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'workspace_member_removed',
        metadata: { workspaceId, targetUserId: body.userId },
      },
    })

    return NextResponse.json({ message: 'Removed' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
