// src/app/dashboard/admin/approvals/page.tsx
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ApprovalsClient } from './approvals-client'

export default async function AdminApprovalsPage() {
  const session = await getSessionRole()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/')
  return <ApprovalsClient />
}
