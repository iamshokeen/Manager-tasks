import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PlaybookLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/')
  return <>{children}</>
}
