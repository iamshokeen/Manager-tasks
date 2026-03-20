// src/app/api/team/route.ts
import { NextResponse } from 'next/server'
import { getTeamMembers, createTeamMember } from '@/lib/services/team'

export async function GET() {
  try {
    const members = await getTeamMembers()
    return NextResponse.json({ data: members })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.name || !body.role || !body.department) {
      return NextResponse.json({ error: 'name, role, and department are required' }, { status: 400 })
    }
    const member = await createTeamMember(body)
    return NextResponse.json({ data: member }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
  }
}
