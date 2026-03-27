// src/app/dashboard/admin/workspaces/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import { WorkspacesClient } from './workspaces-client'

export default async function AdminWorkspacesPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return <WorkspacesClient />
}
