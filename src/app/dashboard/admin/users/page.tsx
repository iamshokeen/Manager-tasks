// src/app/dashboard/admin/users/page.tsx
import { getSessionRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UsersClient } from './users-client'

export default async function AdminUsersPage() {
  const session = await getSessionRole()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/')
  return <UsersClient />
}
