// Cadence (Rounds) — SUPER_ADMIN, MANAGER, SENIOR_IC only
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

const ALLOWED: string[] = ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC']

export default async function CadenceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()
  if (!session || !ALLOWED.includes(session.role)) redirect('/')
  return <>{children}</>
}
