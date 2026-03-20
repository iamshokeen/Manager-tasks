import { NextResponse } from 'next/server'
import { getCadences, createCadence } from '@/lib/services/cadence'

export async function GET() {
  try {
    const cadences = await getCadences()
    return NextResponse.json({ data: cadences })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch cadences' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.name || !body.type || !body.day || !body.time || !body.scope) {
      return NextResponse.json({ error: 'name, type, day, time, and scope are required' }, { status: 400 })
    }
    const cadence = await createCadence(body)
    return NextResponse.json({ data: cadence }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create cadence' }, { status: 500 })
  }
}
