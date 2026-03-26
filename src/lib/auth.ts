// src/lib/auth.ts
import { type NextAuthOptions, getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? 'lohono-cmd-secret-fy27-change-in-prod',
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { teamMember: true },
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamMemberId: user.teamMemberId ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role
        token.teamMemberId = (user as unknown as { teamMemberId?: string }).teamMemberId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string; teamMemberId?: string }).id = token.sub!
        ;(session.user as { id: string; role: string; teamMemberId?: string }).role = token.role as string
        ;(session.user as { id: string; role: string; teamMemberId?: string }).teamMemberId = token.teamMemberId as string | undefined
      }
      return session
    },
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
