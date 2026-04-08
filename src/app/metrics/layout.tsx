// Metrics — all authenticated except EXEC_VIEWER, GUEST
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

const BLOCKED: string[] = ['EXEC_VIEWER', 'GUEST']

export default async function MetricsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()
  if (!session || BLOCKED.includes(session.role)) redirect('/')
  return <>{children}</>
}
