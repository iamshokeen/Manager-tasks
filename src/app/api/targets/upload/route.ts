import { NextRequest, NextResponse } from 'next/server'
import { saveTargets } from '@/lib/services/targets'

export async function POST(req: NextRequest) {
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
