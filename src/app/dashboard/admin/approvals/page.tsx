// src/app/dashboard/admin/approvals/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import { ApprovalsClient } from './approvals-client'

export default async function AdminApprovalsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return <ApprovalsClient />
}
