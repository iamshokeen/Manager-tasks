// src/app/dashboard/admin/workspaces/page.tsx
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WorkspacesClient } from './workspaces-client'

export default async function AdminWorkspacesPage() {
  const session = await getSessionRole()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/')
  return <WorkspacesClient />
}
