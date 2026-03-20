import { NextResponse } from 'next/server'
import { getProjects, createProject } from '@/lib/services/projects'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const filters = {
    stage: searchParams.get('stage') ?? undefined,
    department: searchParams.get('department') ?? undefined,
  }
  try {
    const projects = await getProjects(filters)
    return NextResponse.json({ data: projects })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.title || !body.department) {
      return NextResponse.json({ error: 'title and department are required' }, { status: 400 })
    }
    const project = await createProject(body)
    return NextResponse.json({ data: project }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
