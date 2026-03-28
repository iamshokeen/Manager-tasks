// src/app/api/kpi-access/request/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id ?? ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Upsert — return existing if already present
    const existing = await prisma.kpiAccessRequest.findUnique({ where: { userId } })
    if (existing) {
      return NextResponse.json({ data: existing })
    }
    const request = await prisma.kpiAccessRequest.create({
      data: { userId },
    })
    return NextResponse.json({ data: request }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id?: string }).id ?? ''
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const request = await prisma.kpiAccessRequest.findUnique({ where: { userId } })
    if (!request) {
      return NextResponse.json({ data: { status: 'none' } })
    }
    return NextResponse.json({ data: { status: request.status } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch request status' }, { status: 500 })
  }
}
