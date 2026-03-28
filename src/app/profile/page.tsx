'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { useTheme, THEMES } from '@/components/theme-provider'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import {
  Pencil, Check, X, BadgeCheck, XCircle, UserCheck,
  CheckCircle, Activity, Star, Settings, LogOut,
  Sun, Moon, Clock, User, BookOpen,
} from 'lucide-react'
import { useOnboarding } from '@/context/onboarding-context'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  approvalStatus: string
  isActive: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  teamMemberId: string | null
  manager: { id: string; name: string; role: string } | null
  tasksCompleted: number
  activeProjects: number
  teamSize: number
  oneOnOnesCount: number
  recentActivity: Array<{
    id: string
    action: string
    metadata: Record<string, unknown> | null
    createdAt: string
  }>
  profileCompletion: number
  accountHealth: number
  activityLevel: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<ProfileData> => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/auth/login'
    }
    throw new Error('Failed to fetch profile')
  }
  const json = await res.json()
  return json.data as ProfileData
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function formatRole(role: string) {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function useAnimatedCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    let current = 0
    const steps = 60
    const increment = target / steps
    const interval = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(interval)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(interval)
  }, [target, duration])
  return count
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

function HeroCard({
  data,
  onNameUpdate,
}: {
  data: ProfileData
  onNameUpdate: (name: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(data.name)
  const [saving, setSaving] = useState(false)
  const [barWidth, setBarWidth] = useState(0)

  const taskCount = useAnimatedCounter(data.tasksCompleted)
  const projectCount = useAnimatedCounter(data.activeProjects)
  const peopleCount = useAnimatedCounter(data.teamSize)

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(data.profileCompletion), 300)
    return () => clearTimeout(t)
  }, [data.profileCompletion])

  async function handleSave() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onNameUpdate(trimmed)
      setEditing(false)
    } catch {
      // error toast shown by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-[var(--shadow-glass)] overflow-hidden">
      {/* Azure gradient banner with dot overlay */}
      <div className="relative h-32 bg-gradient-to-br from-[#004ac6] via-[#1d4ed8] to-[#2563eb]">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
      </div>

      <div className="px-6 pb-6">
        {/* Avatar overlapping banner */}
        <div className="relative -mt-10 mb-3">
          <div className="relative w-20 h-20 shrink-0">
            <div className="w-20 h-20 rounded-full ring-4 ring-white dark:ring-card bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden">
              {data.avatarUrl ? (
                <Image src={data.avatarUrl!} alt={data.name} fill className="object-cover" />
              ) : (
                initials(data.name)
              )}
            </div>
            {data.emailVerified && (
              <BadgeCheck className="absolute bottom-0 right-0 w-5 h-5 text-[#004ac6] bg-white rounded-full" />
            )}
          </div>
        </div>

        {/* Editable name */}
        <div className="flex items-center gap-2 mb-1.5">
          {editing ? (
            <>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') { setEditing(false); setNameInput(data.name) }
                }}
                className="text-xl font-bold text-foreground bg-transparent border-b-2 border-primary outline-none flex-1 max-w-xs"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditing(false); setNameInput(data.name) }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground">{data.name}</h2>
              <button
                onClick={() => { setEditing(true); setNameInput(data.name) }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Role + email + since */}
        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {formatRole(data.role)}
          </span>
          <span className="text-muted-foreground">{data.email}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground text-xs">
            Since {format(new Date(data.createdAt), 'MMM yyyy')}
          </span>
        </div>

        {/* Manager line */}
        {data.manager && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              Reports to{' '}
              <span className="font-medium text-foreground">{data.manager.name}</span>
            </span>
          </div>
        )}

        {/* Profile completion bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Profile Completion</span>
            <span>{data.profileCompletion}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#004ac6] to-[#2563eb] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-border border border-border rounded-xl">
          {[
            { label: 'Tasks Done', value: taskCount },
            { label: 'Active Projects', value: projectCount },
            { label: 'Your People', value: peopleCount },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 text-center">
              <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Account Details ──────────────────────────────────────────────────────────

function AccountDetails({ data }: { data: ProfileData }) {
  const approvalColors: Record<string, string> = {
    APPROVED: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    PENDING: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    REJECTED: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  }
  const approvalColor = approvalColors[data.approvalStatus] ?? 'text-muted-foreground bg-muted'

  const rows: Array<{ label: string; node: React.ReactNode }> = [
    {
      label: 'Role',
      node: <span className="text-sm font-medium text-foreground">{formatRole(data.role)}</span>,
    },
    {
      label: 'Approval',
      node: (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${approvalColor}`}>
          {data.approvalStatus}
        </span>
      ),
    },
    {
      label: 'Email Verified',
      node: data.emailVerified ? (
        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <BadgeCheck className="w-4 h-4" /> Yes
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-500 text-sm font-medium">
          <XCircle className="w-4 h-4" /> No
        </span>
      ),
    },
    {
      label: 'Last Login',
      node: (
        <span className="text-sm font-medium text-foreground">
          {data.lastLoginAt
            ? formatDistanceToNow(new Date(data.lastLoginAt), { addSuffix: true })
            : '—'}
        </span>
      ),
    },
    {
      label: 'Member Since',
      node: (
        <span className="text-sm font-medium text-foreground">
          {format(new Date(data.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  if (data.manager) {
    rows.push({
      label: 'Manager',
      node: (
        <span className="text-sm font-medium text-foreground">
          {data.manager.name}{' '}
          <span className="text-muted-foreground text-xs">({formatRole(data.manager.role)})</span>
        </span>
      ),
    })
  }

  if (data.teamMemberId) {
    rows.push({
      label: '1:1s Held',
      node: <span className="text-sm font-medium text-foreground">{data.oneOnOnesCount}</span>,
    })
  }

  return (
    <div className="bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Account Details</h3>
      </div>
      <div>
        {rows.map(({ label, node }) => (
          <div
            key={label}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {label}
            </span>
            {node}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Relaunch Tour Button ─────────────────────────────────────────────────────

function RelaunchTourButton() {
  const { launch } = useOnboarding()
  return (
    <motion.button
      onClick={launch}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#c9a96e] hover:bg-[var(--surface-container-high)] transition-all hover:pl-5"
      whileTap={{ scale: 0.98 }}
    >
      <BookOpen className="w-4 h-4 shrink-0" />
      Relaunch Tour
    </motion.button>
  )
}

// ─── Profile Health + Quick Actions ───────────────────────────────────────────

function ProfileHealth({ data }: { data: ProfileData }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isDark = THEMES.find(t => t.id === theme)?.group !== 'Light'
  const lightTheme = THEMES.find(t => t.group === 'Light')?.id ?? 'azure'
  const darkTheme = THEMES.find(t => t.group === 'Dark')?.id ?? 'gold'

  const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 }

  const healthStats = [
    { label: 'Profile Completion', value: data.profileCompletion, Icon: CheckCircle },
    { label: 'Activity Level', value: data.activityLevel, Icon: Activity },
    { label: 'Account Health', value: data.accountHealth, Icon: Star },
  ]

  const actionLinks = [
    { href: '/settings', label: 'Settings', Icon: Settings, adminOnly: false },
    { href: '/dashboard/admin/activity-log', label: 'Activity Log', Icon: Activity, adminOnly: true },
  ]

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch {
      setSigningOut(false)
      toast.error('Sign out failed. Please try again.')
    }
  }

  return (
    <div className="bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Profile Health</h3>
      </div>

      {/* Hover-expand health bars */}
      <motion.div
        className="bg-muted/40 rounded-xl px-4 py-4 mb-4 cursor-default"
        initial="collapsed"
        whileHover="expanded"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initials(data.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{data.name}</p>
            <p className="text-xs text-muted-foreground">{formatRole(data.role)}</p>
          </div>
        </div>

        <motion.div
          variants={{
            collapsed: { height: 0, opacity: 0, marginTop: 0 },
            expanded: { height: 'auto', opacity: 1, marginTop: '16px' },
          }}
          transition={{ staggerChildren: 0.08, ...springTransition }}
          className="overflow-hidden"
        >
          {healthStats.map(({ label, value, Icon }) => (
            <motion.div
              key={label}
              variants={{
                collapsed: { opacity: 0, y: 8 },
                expanded: { opacity: 1, y: 0 },
              }}
              transition={springTransition}
              className="mt-3 first:mt-0"
            >
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <span>{value}%</span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-1.5 bg-primary rounded-full"
                  variants={{
                    collapsed: { width: '0%' },
                    expanded: { width: `${value}%` },
                  }}
                  transition={springTransition}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div className="space-y-1">
        {mounted && (
          <div className="flex rounded-lg bg-muted p-1 mb-3">
            <motion.button
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                !isDark ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setTheme(lightTheme)}
              whileTap={{ scale: 0.97 }}
            >
              <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : ''}`} />
              Light
            </motion.button>
            <motion.button
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                isDark ? 'bg-neutral-700 shadow-sm text-white' : 'text-muted-foreground'
              }`}
              onClick={() => setTheme(darkTheme)}
              whileTap={{ scale: 0.97 }}
            >
              <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-300' : ''}`} />
              Dark
            </motion.button>
          </div>
        )}

        {actionLinks
          .filter(item => !item.adminOnly || data.role === 'SUPER_ADMIN')
          .map(({ href, label, Icon }) => (
            <Link key={href} href={href}>
              <motion.div
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-all hover:pl-5"
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                {label}
              </motion.div>
            </Link>
          ))}

        <RelaunchTourButton />

        <motion.button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:pl-5 disabled:opacity-40"
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {signingOut ? 'Signing out\u2026' : 'Sign Out'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

function RecentActivity({ data }: { data: ProfileData }) {
  return (
    <div className="bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
      </div>
      {data.recentActivity.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
      ) : (
        <div>
          {data.recentActivity.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-3 py-3 border-b border-border last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground">{entry.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-6xl animate-pulse">
      <div className="bg-card rounded-2xl shadow-[var(--shadow-glass)] overflow-hidden">
        <div className="h-32 bg-muted" />
        <div className="px-6 pb-6">
          <div className="w-20 h-20 rounded-full bg-muted -mt-10 mb-4 ring-4 ring-white dark:ring-card" />
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-72 bg-muted rounded mb-5" />
          <div className="h-2 bg-muted rounded mb-5" />
          <div className="grid grid-cols-3 border border-border rounded-xl overflow-hidden">
            {[0, 1, 2].map(i => (
              <div key={i} className="py-5 px-4">
                <div className="h-6 bg-muted rounded mb-1 mx-auto w-12" />
                <div className="h-3 bg-muted rounded mx-auto w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-5">
        <div className="flex-1 h-72 bg-card rounded-2xl shadow-[var(--shadow-glass)]" />
        <div className="flex-1 h-72 bg-card rounded-2xl shadow-[var(--shadow-glass)]" />
      </div>
    </div>
  )
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data, error, isLoading, mutate: mutateProfile } = useSWR<ProfileData>(
    '/api/profile',
    fetcher
  )

  async function handleNameUpdate(name: string) {
    if (!data) return
    const optimistic: ProfileData = { ...data, name }
    await mutateProfile(optimistic, { revalidate: false })
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed')
      await mutateProfile()
      toast.success('Name updated')
    } catch {
      await mutateProfile(data, { revalidate: false })
      toast.error('Failed to update name')
      throw new Error('update failed')
    }
  }

  if (isLoading) return <ProfileSkeleton />

  if (error || !data) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Failed to load profile. Please refresh.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <HeroCard data={data} onNameUpdate={handleNameUpdate} />
      <div className="flex gap-5">
        <AccountDetails data={data} />
        <ProfileHealth data={data} />
      </div>
      <RecentActivity data={data} />
    </div>
  )
}
