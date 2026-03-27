import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getOneOnOnes, createOneOnOne } from '@/lib/services/one-on-ones'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('memberId') ?? undefined
  try {
    const records = await getOneOnOnes(memberId)
    return NextResponse.json({ data: records })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch one-on-ones' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.memberId || !body.date) {
      return NextResponse.json({ error: 'memberId and date are required' }, { status: 400 })
    }
    const record = await createOneOnOne(body)
    return NextResponse.json({ data: record }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create one-on-one' }, { status: 500 })
  }
}
