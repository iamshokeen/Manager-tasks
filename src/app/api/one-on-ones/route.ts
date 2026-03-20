import { NextResponse } from 'next/server'
import { getOneOnOnes, createOneOnOne } from '@/lib/services/one-on-ones'

export async function GET(req: Request) {
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
