import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStakeholders, createStakeholder } from '@/lib/services/stakeholders'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const stakeholders = await getStakeholders()
    return NextResponse.json({ data: stakeholders })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch stakeholders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.name || !body.frequency || !body.channel) {
      return NextResponse.json({ error: 'name, frequency, and channel are required' }, { status: 400 })
    }
    const stakeholder = await createStakeholder(body)
    return NextResponse.json({ data: stakeholder }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create stakeholder' }, { status: 500 })
  }
}
