import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { saveTargets } from '@/lib/services/targets'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const text = await file.text()
    const targets = await saveTargets(text)
    return NextResponse.json({ ok: true, targets })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
