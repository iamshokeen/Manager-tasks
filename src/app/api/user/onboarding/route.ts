// src/app/api/user/onboarding/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({
      data: {
        completed: session.user.onboardingCompleted,
        role: session.user.role,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true },
    })

    return NextResponse.json({ data: { completed: true } })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
