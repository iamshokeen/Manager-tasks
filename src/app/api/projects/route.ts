import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getProjects, createProject } from '@/lib/services/projects'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as { id: string; role?: string; teamMemberId?: string }
  const { searchParams } = new URL(req.url)
  const filters = {
    stage: searchParams.get('stage') ?? undefined,
    department: searchParams.get('department') ?? undefined,
  }

  // SUPER_ADMIN: see only projects they created or that have a stakeholder linked
  // Everyone else: see projects they created or have tasks assigned to them
  const ownershipFilter = {
    userId: user.id,
    teamMemberId: user.teamMemberId ?? undefined,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
  }

  try {
    const projects = await getProjects(filters, ownershipFilter)
    return NextResponse.json({ data: projects })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionUser = session.user as { id: string; role?: string }
  if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Only Super Admin and Manager can create projects' }, { status: 403 })
  }

  try {
    const body = await req.json()
    if (!body.title || !body.department) {
      return NextResponse.json({ error: 'title and department are required' }, { status: 400 })
    }
    body.createdByUserId = sessionUser.id
    const project = await createProject(body)
    return NextResponse.json({ data: project }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
