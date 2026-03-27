// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

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

    const body = await request.json() as { role?: Role; isActive?: boolean }

    const updateData: { role?: Role; isActive?: boolean } = {}
    if (body.role !== undefined) updateData.role = body.role
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    if (body.role !== undefined && body.role !== target.role) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'role_changed',
          metadata: { userId: id, from: target.role, to: body.role },
        },
      })
    }

    if (body.isActive === false && target.isActive === true) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'user_deactivated',
          metadata: { userId: id },
        },
      })
    }

    return NextResponse.json({ user: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
