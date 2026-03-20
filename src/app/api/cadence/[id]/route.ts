import { NextResponse } from 'next/server'
import { getCadence, updateCadence, deleteCadence } from '@/lib/services/cadence'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cadence = await getCadence(id)
  if (!cadence) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: cadence })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const cadence = await updateCadence(id, body)
    return NextResponse.json({ data: cadence })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteCadence(id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
