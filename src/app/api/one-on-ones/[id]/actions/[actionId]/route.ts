import { NextResponse } from 'next/server'
import { updateActionItem } from '@/lib/services/one-on-ones'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; actionId: string }> }) {
  const { actionId } = await params
  try {
    const { completed } = await req.json()
    const action = await updateActionItem(actionId, completed)
    return NextResponse.json({ data: action })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 })
  }
}
