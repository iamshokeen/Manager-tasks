import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getOneOnOne, updateOneOnOne, deleteOneOnOne } from '@/lib/services/one-on-ones'
import { canRoleAsync } from '@/lib/rbac'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as { id: string; role?: string; teamMemberId?: string }
  if (!await canRoleAsync(user.role ?? '', 'one_on_ones', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id } = await params
    const record = await getOneOnOne(id)
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Ownership check: creator or the member involved
    if (user.role !== 'SUPER_ADMIN') {
      const isOwner = record.createdByUserId === user.id
      const isMember = user.teamMemberId && record.memberId === user.teamMemberId
      if (!isOwner && !isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ data: record })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch one-on-one' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'one_on_ones', 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    const body = await req.json()
    const record = await updateOneOnOne(id, body)
    return NextResponse.json({ data: record })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'one_on_ones', 'delete')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    await deleteOneOnOne(id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
