// One-on-Ones — SUPER_ADMIN, MANAGER, SENIOR_IC, DIRECT_REPORT only
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

const ALLOWED: string[] = ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT']

export default async function OneOnOnesLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()
  if (!session || !ALLOWED.includes(session.role)) redirect('/')
  return <>{children}</>
}
