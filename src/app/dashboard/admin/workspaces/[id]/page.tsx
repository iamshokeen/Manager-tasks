// src/app/dashboard/admin/workspaces/[id]/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import { WorkspaceDetailClient } from './workspace-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminWorkspaceDetailPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/dashboard')
  const { id } = await params
  return <WorkspaceDetailClient workspaceId={id} />
}
