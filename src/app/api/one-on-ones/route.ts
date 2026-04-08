import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getOneOnOnes, createOneOnOne } from '@/lib/services/one-on-ones'
import { canRoleAsync } from '@/lib/rbac'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'one_on_ones', 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = session.user as { id: string; role?: string; teamMemberId?: string }
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId') ?? undefined

  // Private: only see 1:1s you created or where you are the member
  const ownershipFilter = user.role === 'SUPER_ADMIN'
    ? undefined
    : { userId: user.id, teamMemberId: user.teamMemberId ?? undefined }

  try {
    const records = await getOneOnOnes(memberId, ownershipFilter)
    return NextResponse.json({ data: records })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch one-on-ones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'one_on_ones', 'create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    if (!body.memberId || !body.date) {
      return NextResponse.json({ error: 'memberId and date are required' }, { status: 400 })
    }
    const sessionUser = session.user as { id: string }
    body.createdByUserId = sessionUser.id
    const record = await createOneOnOne(body)
    return NextResponse.json({ data: record }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create one-on-one' }, { status: 500 })
  }
}
