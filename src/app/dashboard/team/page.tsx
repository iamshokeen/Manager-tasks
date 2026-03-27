// src/app/dashboard/team/page.tsx
import { getCurrentUser } from '@/lib/getCurrentUser'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, CheckSquare, MessageSquare, UserPlus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Role } from '@prisma/client'

export default async function DashboardTeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MANAGER') {
    redirect('/')
  }

  // Fetch direct reports
  const reports = await prisma.user.findMany({
    where: { managerId: user.id },
    orderBy: { name: 'asc' },
  })

  // If SUPER_ADMIN and no reports, show all non-admin users
  const teamMembers =
    reports.length === 0 && user.role === 'SUPER_ADMIN'
      ? await prisma.user.findMany({
          where: { role: { not: 'SUPER_ADMIN' as Role }, isActive: true },
          orderBy: { name: 'asc' },
        })
      : reports

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">My Team</h1>
          <p className="text-sm text-[var(--outline)] mt-1">
            {teamMembers.length} direct report{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-20 text-[var(--outline)]">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No direct reports yet</p>
          <p className="text-sm mt-1">Assign users to your team via the Admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER: 'bg-blue-100 text-blue-700',
  SENIOR_IC: 'bg-purple-100 text-purple-700',
  DIRECT_REPORT: 'bg-green-100 text-green-700',
  EXEC_VIEWER: 'bg-orange-100 text-orange-700',
  GUEST: 'bg-gray-100 text-gray-600',
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  SENIOR_IC: 'Senior IC',
  DIRECT_REPORT: 'Direct Report',
  EXEC_VIEWER: 'Exec Viewer',
  GUEST: 'Guest',
}

function MemberCard({ member }: { member: { id: string; name: string; role: Role; email: string; lastLoginAt: Date | null } }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--outline-variant)]/30 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
          {initials(member.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--foreground)] truncate">{member.name}</h3>
          <p className="text-xs text-[var(--outline)] truncate">{member.email}</p>
          <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        </div>
      </div>

      <div className="text-xs text-[var(--outline)] mb-4">
        {member.lastLoginAt
          ? `Last active ${formatDistanceToNow(member.lastLoginAt, { addSuffix: true })}`
          : 'Never logged in'}
      </div>

      <div className="flex gap-2">
        <Link
          href={`/dashboard/team/${member.id}`}
          className="flex-1 text-center py-1.5 px-3 rounded-lg bg-[var(--surface-container-low)] text-[var(--foreground)] text-xs font-medium hover:bg-white/80 transition-colors"
        >
          View Profile
        </Link>
        <Link
          href={`/tasks/new?assigneeId=${member.id}`}
          title="Assign task"
          className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-[var(--outline)] hover:text-primary hover:bg-white/80 transition-colors"
        >
          <CheckSquare size={14} />
        </Link>
        <Link
          href={`/one-on-ones/new?memberId=${member.id}`}
          title="Log 1:1"
          className="p-1.5 rounded-lg bg-[var(--surface-container-low)] text-[var(--outline)] hover:text-primary hover:bg-white/80 transition-colors"
        >
          <MessageSquare size={14} />
        </Link>
      </div>
    </div>
  )
}
