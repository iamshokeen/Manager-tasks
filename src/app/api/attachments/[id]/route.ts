// src/app/api/attachments/[id]/route.ts
//
// DELETE → remove an attachment row and its blob. Only the uploader, the
// SA, or someone in the uploader's manager chain can remove it.
import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { canManageUser } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const me = session.user as { id: string; role?: string }

  const { id } = await params
  const row = await prisma.attachment.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Owner OR SA OR someone who manages the uploader.
  const isOwner = row.uploaderId === me.id
  const isSA = me.role === 'SUPER_ADMIN'
  const manages = !isOwner && !isSA && row.uploaderId
    ? await canManageUser(me.id, me.role ?? '', row.uploaderId)
    : false
  if (!isOwner && !isSA && !manages) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await del(row.url)
  } catch (e) {
    // Don't block the DB delete if the blob is already gone.
    console.warn('[attachment delete] blob del failed', e)
  }
  await prisma.attachment.delete({ where: { id } })
  return NextResponse.json({ data: { id } })
}
