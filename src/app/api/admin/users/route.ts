// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import type { Role, ApprovalStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role') as Role | null
    const approvalStatusParam = searchParams.get('approvalStatus') as ApprovalStatus | null

    const where: Record<string, unknown> = {}
    if (roleParam) where.role = roleParam
    if (approvalStatusParam) where.approvalStatus = approvalStatusParam

    const users = await prisma.user.findMany({
      where,
      include: {
        workspaceMemberships: {
          include: {
            workspace: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      approvalStatus: u.approvalStatus,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      workspaceMemberships: u.workspaceMemberships.map((m) => ({
        workspace: { name: m.workspace.name },
      })),
    }))

    return NextResponse.json({ data: formatted })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
