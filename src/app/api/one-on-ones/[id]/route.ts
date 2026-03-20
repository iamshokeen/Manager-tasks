import { NextResponse } from 'next/server'
import { getOneOnOne, updateOneOnOne } from '@/lib/services/one-on-ones'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const record = await getOneOnOne(id)
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: record })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const record = await updateOneOnOne(id, body)
    return NextResponse.json({ data: record })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
