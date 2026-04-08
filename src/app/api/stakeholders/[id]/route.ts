import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStakeholder, updateStakeholder, deleteStakeholder } from '@/lib/services/stakeholders'
import { canRoleAsync } from '@/lib/rbac'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'stakeholder_crm', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const s = await getStakeholder(id)
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: s })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'stakeholder_crm', 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    const body = await req.json()
    const s = await updateStakeholder(id, body)
    return NextResponse.json({ data: s })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'stakeholder_crm', 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    await deleteStakeholder(id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
