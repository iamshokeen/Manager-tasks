// Assessment (Channel Pulse / Check-in GMV) — SUPER_ADMIN, MANAGER only
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

const ALLOWED: string[] = ['SUPER_ADMIN', 'MANAGER']

export default async function AssessmentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()
  if (!session || !ALLOWED.includes(session.role)) redirect('/')
  return <>{children}</>
}
