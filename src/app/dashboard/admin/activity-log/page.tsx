// src/app/dashboard/admin/activity-log/page.tsx
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ActivityLogClient } from './activity-log-client'

export default async function AdminActivityLogPage() {
  const session = await getSessionRole()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/')
  return <ActivityLogClient />
}
