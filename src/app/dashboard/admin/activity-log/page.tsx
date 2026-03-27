// src/app/dashboard/admin/activity-log/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import { ActivityLogClient } from './activity-log-client'

export default async function AdminActivityLogPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return <ActivityLogClient />
}
