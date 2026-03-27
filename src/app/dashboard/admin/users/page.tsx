// src/app/dashboard/admin/users/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import { UsersClient } from './users-client'

export default async function AdminUsersPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  return <UsersClient />
}
