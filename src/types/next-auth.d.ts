// src/types/next-auth.d.ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: 'MANAGER' | 'JUNIOR'
      teamMemberId?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    teamMemberId?: string
  }
}
