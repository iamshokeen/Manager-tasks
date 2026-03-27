// src/app/dashboard/team/[userId]/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Calendar } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { Role } from '@prisma/client'

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  SENIOR_IC: 'Senior IC',
  DIRECT_REPORT: 'Direct Report',
  EXEC_VIEWER: 'Exec Viewer',
  GUEST: 'Guest',
}
const ROLE_COLORS: Record<string, string> = {
  MANAGER: 'bg-blue-100 text-blue-700',
  SENIOR_IC: 'bg-purple-100 text-purple-700',
  DIRECT_REPORT: 'bg-green-100 text-green-700',
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default async function TeamMemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const viewer = await getCurrentUser()
  if (!viewer) redirect('/auth/login')

  // Access control: SUPER_ADMIN sees all, MANAGER sees own reports
  const isAllowed =
    viewer.role === 'SUPER_ADMIN' ||
    (viewer.role === 'MANAGER' &&
      (await prisma.user.count({ where: { id: userId, managerId: viewer.id } })) > 0)

  if (!isAllowed) redirect('/')

  const member = await prisma.user.findUnique({ where: { id: userId } })
  if (!member) notFound()

  // Fetch tasks assigned to this user via teamMember linkage
  const teamMember = member.teamMemberId
    ? await prisma.teamMember.findUnique({
        where: { id: member.teamMemberId },
        include: {
          tasks: { orderBy: { updatedAt: 'desc' }, take: 20 },
          oneOnOnes: { orderBy: { date: 'desc' }, take: 10 },
        },
      })
    : null

  return (
    <div>
      <Link
        href="/dashboard/team"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--outline)] hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Team
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--outline-variant)]/30 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {initials(member.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{member.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--outline)]">
                <Mail size={12} />
                {member.email}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--outline)]">
                <Calendar size={12} />
                Joined {format(member.createdAt, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-xl border border-[var(--outline-variant)]/30 p-5">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Tasks</h2>
          {teamMember?.tasks.length ? (
            <div className="space-y-2">
              {teamMember.tasks.slice(0, 10).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface-container-low)] transition-colors group"
                >
                  <span className="text-sm text-[var(--foreground)] truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </span>
                  <StatusPill status={task.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--outline)]">No tasks assigned.</p>
          )}
        </div>

        {/* 1:1 History */}
        <div className="bg-white rounded-xl border border-[var(--outline-variant)]/30 p-5">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">1:1 History</h2>
          {teamMember?.oneOnOnes.length ? (
            <div className="space-y-2">
              {teamMember.oneOnOnes.map((oo) => (
                <Link
                  key={oo.id}
                  href={`/one-on-ones/${oo.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface-container-low)] transition-colors"
                >
                  <span className="text-sm text-[var(--foreground)]">
                    {format(oo.date, 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs text-[var(--outline)]">
                    {formatDistanceToNow(oo.date, { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--outline)]">No 1:1s logged yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-600',
    review: 'bg-yellow-100 text-yellow-700',
    blocked: 'bg-red-100 text-red-600',
    done: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0 ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
