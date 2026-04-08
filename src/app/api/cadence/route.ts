import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCadences, createCadence } from '@/lib/services/cadence'
import { canRoleAsync } from '@/lib/rbac'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string; role?: string }
  // Private to owner; SUPER_ADMIN sees all
  const userId = user.role === 'SUPER_ADMIN' ? undefined : user.id

  try {
    const cadences = await getCadences(userId)
    return NextResponse.json({ data: cadences })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch cadences' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as { role?: string }).role ?? ''
  if (!await canRoleAsync(role, 'team_pulse', 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    if (!body.name || !body.type || !body.day || !body.time || !body.scope) {
      return NextResponse.json({ error: 'name, type, day, time, and scope are required' }, { status: 400 })
    }
    // Stamp owner
    const sessionUser = session.user as { id: string }
    body.userId = sessionUser.id
    const cadence = await createCadence(body)
    return NextResponse.json({ data: cadence }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create cadence' }, { status: 500 })
  }
}
