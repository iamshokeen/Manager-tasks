import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FALLBACK = ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'departments' } })
    if (!setting) {
      return NextResponse.json({ departments: FALLBACK })
    }
    const departments: string[] = JSON.parse(setting.value)
    return NextResponse.json({ departments })
  } catch {
    return NextResponse.json({ departments: FALLBACK })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const departments: string[] = body.departments ?? FALLBACK
    await prisma.setting.upsert({
      where: { key: 'departments' },
      update: { value: JSON.stringify(departments) },
      create: { key: 'departments', value: JSON.stringify(departments) },
    })
    return NextResponse.json({ departments })
  } catch {
    return NextResponse.json({ error: 'Failed to save departments' }, { status: 500 })
  }
}
