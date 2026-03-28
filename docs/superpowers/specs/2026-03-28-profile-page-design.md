# Profile Page Design Spec — Kairos
**Date:** 2026-03-28
**Status:** Ready for implementation

---

## Overview

A single `/profile` page for the authenticated user. Shows identity, account metadata, computed stats, account health, quick actions, and recent activity. Fully inline-editable for name. No separate settings duplication — this is the user's personal command card.

---

## Files Affected

| File | Action |
|------|--------|
| `src/app/api/profile/route.ts` | CREATE — GET + PATCH |
| `src/app/profile/page.tsx` | CREATE — main page |
| `src/components/layout/sidebar.tsx` | MODIFY — add Profile link |
| `src/components/layout/topbar.tsx` | MODIFY — add PAGE_TITLES entry |

---

## API Route — `src/app/api/profile/route.ts`

### GET `/api/profile`

Auth: `getSession()` (full DB, needed for Prisma queries).
Returns `{ data: ProfileData }`.

**Prisma queries:**
1. `prisma.user.findUnique` — full user with nested manager TeamMember
2. `prisma.task.count` — `where: { assigneeId: user.teamMemberId, status: 'done' }` (skip if no teamMemberId)
3. `prisma.project.count` — `where: { stage: { not: 'closed' } }` for activeProjects (global, since user is the manager)
4. `prisma.teamMember.count` — for teamSize (all non-deleted members)
5. `prisma.oneOnOne.count` — `where: { memberId: user.teamMemberId }` (skip if no teamMemberId)
6. `prisma.activityLog.findMany` — `where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5` — for recentActivity

**Response shape:**
```ts
{
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  approvalStatus: string        // 'APPROVED' | 'PENDING' | 'REJECTED'
  isActive: boolean
  emailVerified: boolean
  lastLoginAt: string | null    // ISO string
  createdAt: string             // ISO string
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
  profileCompletion: number   // 0–100
  accountHealth: number       // 0–100
  activityLevel: number       // 0–100
}
```

**Profile completion score (computed server-side, 0–100):**
- Name set: +25
- Email verified: +25
- Approval status APPROVED: +25
- isActive: +25

**Account health score (computed server-side, 0–100):**
- isActive: +34
- approvalStatus APPROVED: +33
- emailVerified: +33

**Activity level score (computed server-side, 0–100):**
- Based on activityLogs in last 30 days. 0 logs = 0%, 20+ logs = 100%, linear between.

All three scores included in the GET response as `profileCompletion`, `accountHealth`, `activityLevel`.

### PATCH `/api/profile`

Auth: `getSession()`.
Body: `{ name?: string; avatarUrl?: string }` — both optional, at least one required.
Validates: name must be non-empty string if provided.
Returns `{ data: { id, name, email, avatarUrl } }` — minimal refresh payload.

---

## Page — `src/app/profile/page.tsx`

**Type:** `'use client'` — SWR fetch, framer-motion, next-themes.
**Data:** `useSWR('/api/profile', fetcher)` where fetcher unwraps `.data`.
**Loading state:** Skeleton placeholders matching card shapes (no spinner).
**Error state:** Inline error message in hero card area.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  HERO CARD (full width)                                   │
│  Azure banner → avatar overlap → name + role + email     │
│  Profile completion bar → Stats row                       │
└──────────────────────────────────────────────────────────┘
┌─────────────────────────┐  ┌────────────────────────────┐
│  ACCOUNT DETAILS (left) │  │  PROFILE HEALTH (right)    │
│  Metadata rows          │  │  Hover-expand progress bars│
│                         │  │  + Quick Actions below     │
└─────────────────────────┘  └────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│  RECENT ACTIVITY (full width)                            │
│  Last 5 activity log entries                             │
└──────────────────────────────────────────────────────────┘
```

---

### Section 1: Hero Card

**Source inspiration:** `profile-card.tsx` (banner/avatar/exp-bar/stats) + `profile-dropdown.tsx` (verified badge/name header)

**Implementation:**
- Outer: `bg-card rounded-2xl shadow-[var(--shadow-glass)] overflow-hidden`
- **Banner:** `h-32` div, `bg-gradient-to-br from-[#004ac6] via-[#1d4ed8] to-[#2563eb]`
  - Radial dot overlay: `absolute inset-0 opacity-10` SVG pattern (5px dots)
- **Avatar:** `w-20 h-20` absolutely positioned overlapping banner bottom edge (`-mt-10 ml-6`)
  - Initials fallback: first letter of first + last name, `bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white`
  - White border ring: `ring-4 ring-white rounded-full`
  - If `emailVerified`: `BadgeCheck` icon (lucide) in blue, `w-5 h-5`, bottom-right of avatar
- **Name row:** `text-xl font-bold text-foreground` — editable on click
  - Default: name + pencil icon button (`Pencil` lucide, `w-4 h-4 text-muted-foreground`)
  - Edit mode: `<input>` pre-filled + `Check` + `X` buttons — PATCH on Check, revert on X
  - Optimistic update: update SWR cache immediately, rollback on error + `toast.error()`
- **Meta row:** Role badge (pill, `bg-primary/10 text-primary text-xs font-bold`) + email (muted) + "Since MMM YYYY" (muted)
  - Manager line: if `manager` exists — "Reports to: [name]" in muted text, `UserCheck` icon
- **Profile Completion bar:**
  - Label: "Profile Completion" left, `{profileCompletion}%` right, both `text-xs text-muted-foreground`
  - Track: `h-2 bg-secondary rounded-full`
  - Fill: `motion.div` animated from `width: 0` → `width: {profileCompletion}%` on mount (spring, 0.8s)
  - Color: `bg-gradient-to-r from-[#004ac6] to-[#2563eb]`
- **Stats row:** 3-column grid with dividers
  - `Tasks Done` → `tasksCompleted` (AnimatedCounter)
  - `Active Projects` → `activeProjects` (AnimatedCounter)
  - `Your People` → `teamSize` (AnimatedCounter)
  - AnimatedCounter: counts from 0→value over 1.5s using `useEffect` + `setInterval`

---

### Section 2: Account Details (left, ~55% width)

**Source inspiration:** `freelancer-profile-card.tsx` stat row layout

**Implementation:**
- `bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6`
- `h3` header: "Account Details" with `User` icon
- Rows (each): `flex justify-between items-center py-3 border-b border-border last:border-0`
  - Label: `text-[10px] font-bold tracking-widest uppercase text-muted-foreground`
  - Value: `text-sm font-medium text-foreground`

**Rows in order:**
1. Role → formatted label (e.g. "SUPER_ADMIN" → "Super Admin")
2. Approval → colored pill: APPROVED=green, PENDING=amber, REJECTED=red
3. Email Verified → `BadgeCheck` green or `XCircle` red icon + "Yes"/"No"
4. Last Login → formatted date + relative time ("3 days ago") — `date-fns` `formatDistanceToNow`
5. Member Since → `format(createdAt, 'MMM d, yyyy')`
6. Manager → name + role, or "No manager" muted — only if `teamMemberId` exists
7. 1:1s Held → `oneOnOnesCount` — only if `teamMemberId` exists

---

### Section 3: Profile Health + Quick Actions (right, ~45% width)

**Source inspiration:** `user-profile-card.tsx` (hover-expand progress bars) + `profile-dropdown.tsx` (theme toggle + menu)

**Implementation:**
- `bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6`
- `h3` header: "Profile Health" with `Activity` icon

**Top: Hover-expand health bars (from user-profile-card.tsx)**
- `motion.div` with `initial="collapsed" whileHover="expanded"` on the card inner area
- Base state (collapsed): shows name + role + avatar row only
- Expanded: staggered reveal of 3 progress bars:
  1. Profile Completion — `profileCompletion`%
  2. Activity Level — `activityLevel`%
  3. Account Health — `accountHealth`%
- Each bar: label + icon left, value right, then animated `motion.div` progress bar
- Bar color: `bg-primary` (Azure blue)
- Transition: `spring, stiffness: 300, damping: 30`

**Bottom: Quick Actions panel**
- Thin divider above
- Theme toggle: segmented control (Light | Dark), `next-themes` `useTheme`
  - Active segment: `bg-white shadow-sm` on light bg, or `bg-neutral-700` on dark
  - `Sun` + `Moon` icons (lucide)
- Action rows (animated `motion.div`, `whileTap: { scale: 0.98 }`):
  - `Settings` → `href="/settings"` — `Settings` icon
  - `Activity Log` → `href="/dashboard/admin/activity-log"` — `Activity` icon — **SUPER_ADMIN only** (read role from SWR data)
  - `Sign Out` → calls `POST /api/auth/logout` then `router.push('/auth/login')` — `LogOut` icon, red text

---

### Section 4: Recent Activity (full width)

**Source inspiration:** Activity log pattern already used in admin pages

**Implementation:**
- `bg-card rounded-2xl shadow-[var(--shadow-glass)] p-6`
- `h3` header: "Recent Activity" with `Clock` icon
- If `recentActivity.length === 0`: empty state — "No recent activity" muted centered text
- Each entry: `flex items-start gap-3 py-3 border-b border-border last:border-0`
  - Icon: `Activity` lucide in `w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0`
  - Content: action text in `text-sm text-foreground` + relative time in `text-xs text-muted-foreground`
  - Time: `formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })`

---

## Sidebar Update — `src/components/layout/sidebar.tsx`

Add Profile to the **footer** of the sidebar (above the "FY27 · Kairos" text), as a pinned user link — not inside a nav group. This keeps it visually distinct from navigation.

```tsx
// In the footer section, above the FY27 text:
<Link href="/profile" className={cn(
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
  pathname === '/profile'
    ? 'text-primary bg-white/60 font-semibold'
    : 'text-[var(--outline)] hover:text-[var(--foreground)] hover:bg-white/40'
)}>
  <UserCircle size={18} strokeWidth={pathname === '/profile' ? 2.5 : 1.75} className="shrink-0" />
  <span className="whitespace-nowrap">Profile</span>
</Link>
```

Import `UserCircle` from `lucide-react`.

---

## Topbar Update — `src/components/layout/topbar.tsx`

Add one entry to `PAGE_TITLES`:
```ts
'/profile': 'Profile',
```

---

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| `animated-profile-card.tsx` (GSAP) | Skipped | GSAP not installed; adding it for one animation is overkill |
| Avatar image | Initials fallback only | No image upload flow in scope; keep it clean |
| Inline edit scope | Name only | avatarUrl not editable in this version |
| Profile Health trigger | `whileHover` on inner panel | Matches user-profile-card.tsx source exactly, no click needed |
| Theme toggle placement | Quick Actions section | Mirrors profile-dropdown.tsx exactly; logical with other account actions |
| Stats for non-TeamMembers | tasksCompleted + oneOnOnesCount = 0 | SUPER_ADMIN may not have teamMemberId — zero gracefully |
| Scores computation | Server-side in GET route | Keeps page component clean; no client-side business logic |
| SWR mutation | Optimistic with rollback | Fast UX for name edit, consistent with rest of app |

---

## Dependencies (all already installed)

- `framer-motion ^12.38.0` ✓
- `next-themes ^0.4.6` ✓
- `swr ^2.4.1` ✓
- `date-fns ^4.1.0` ✓
- `sonner ^2.0.7` ✓
- `lucide-react` ✓

No new packages needed.

---

## Out of Scope (this version)

- Avatar image upload
- Password/OTP change flow
- Notification preferences
- Onboarding tutorial (separate spec)
