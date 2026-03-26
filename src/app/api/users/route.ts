// src/app/api/users/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamMemberId: true,
        teamMember: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: users })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, role, teamMemberId } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'name, email, and password are required' },
        { status: 400 }
      )
    }

    const validRoles = ['MANAGER', 'JUNIOR']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role ?? 'JUNIOR',
        ...(teamMemberId ? { teamMemberId } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamMemberId: true,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create user'
    // Handle unique constraint violation (duplicate email)
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
