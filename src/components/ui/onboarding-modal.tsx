// src/components/ui/onboarding-modal.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'

// ─── Step definitions ─────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface Feature {
  icon: string
  label: string
  description: string
}

interface Step {
  icon: string
  iconColor: string
  iconBg: string
  title: string
  body: string
  features: [Feature, Feature]
}

const OPERATOR_STEPS: Step[] = [
  {
    icon: 'architecture',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Welcome to Kairos.',
    body: "You're the operator. Kairos helps you decide, delegate, and close every loop. Each section is built around one thing: your next right move.",
    features: [
      { icon: 'hub', label: 'Command View', description: 'Full workspace visibility' },
      { icon: 'bolt', label: 'Fast Execution', description: 'Drop tasks in seconds' },
    ],
  },
  {
    icon: 'dashboard',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Your command center.',
    body: "The Dashboard surfaces what needs your attention right now — overdue tasks, team pulse, this week's cadences, and revenue KPIs. Start here every morning.",
    features: [
      { icon: 'trending_up', label: 'Revenue KPIs', description: 'Live GMV tracking' },
      { icon: 'assignment_late', label: 'Overdue Alerts', description: 'Surfaced automatically' },
    ],
  },
  {
    icon: 'task_alt',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Tasks move on the board.',
    body: 'Drop tasks, assign them to your people, set priorities. The Kanban board shows where everything stands. Use "Drop a Task" for anything that needs to move.',
    features: [
      { icon: 'view_kanban', label: 'Kanban Board', description: 'Visual status tracking' },
      { icon: 'psychology', label: 'AI Parsing', description: 'Extract from notes' },
    ],
  },
  {
    icon: 'groups',
    iconColor: '#526074',
    iconBg: 'rgba(82,96,116,0.1)',
    title: 'Your People.',
    body: 'Your direct reports, their 1:1s, and their cadences — all in one place. Track follow-through without micromanaging.',
    features: [
      { icon: 'person_check', label: '1:1 History', description: 'Structured check-ins' },
      { icon: 'signal_cellular_alt', label: 'Delegation Level', description: 'Calibrated autonomy' },
    ],
  },
  {
    icon: 'all_inclusive',
    iconColor: 'var(--tertiary)',
    iconBg: 'rgba(134,84,0,0.1)',
    title: 'Resolve Open Loops.',
    body: "Every thread that can't close yet lives here. Snooze what isn't urgent. Convert to task when it's time to act. Nothing falls through.",
    features: [
      { icon: 'sync_alt', label: 'Real-time Sync', description: 'Global state consistency' },
      { icon: 'priority_high', label: 'Auto-Prioritize', description: 'Entropy detection logic' },
    ],
  },
  {
    icon: 'auto_awesome',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Telos is your execution layer.',
    body: "If it doesn't need you, Telos can do it. Use AI inside tasks and projects to generate work, summarize progress, and parse action items — fast.",
    features: [
      { icon: 'summarize', label: 'AI Summaries', description: 'Progress at a glance' },
      { icon: 'task_alt', label: 'Task Generation', description: 'From project descriptions' },
    ],
  },
]

const CONTRIBUTOR_STEPS: Step[] = [
  {
    icon: 'architecture',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Welcome to Kairos.',
    body: 'Your work, organized. Kairos keeps your assigned tasks, notes, and check-ins in one place so nothing gets lost and nothing surprises you.',
    features: [
      { icon: 'hub', label: 'Everything Here', description: 'Tasks, notes, check-ins' },
      { icon: 'bolt', label: 'Stay on Track', description: 'Priority-sorted daily view' },
    ],
  },
  {
    icon: 'checklist',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'My Tasks.',
    body: 'Everything assigned to you lives here. Sorted by priority and due date. Start here each day — it is your personal execution list.',
    features: [
      { icon: 'sort', label: 'Priority Sorted', description: 'Most urgent first' },
      { icon: 'event_available', label: 'Due Dates', description: 'Never miss a deadline' },
    ],
  },
  {
    icon: 'sticky_note_2',
    iconColor: '#526074',
    iconBg: 'rgba(82,96,116,0.1)',
    title: 'Notes.',
    body: 'Capture context, meeting notes, and decisions. Notes attach to tasks, projects, and people. Write it down once — find it anywhere.',
    features: [
      { icon: 'link', label: 'Linked Context', description: 'Attached to tasks & people' },
      { icon: 'search', label: 'Full Search', description: 'Find anything instantly' },
    ],
  },
  {
    icon: 'forum',
    iconColor: 'var(--tertiary)',
    iconBg: 'rgba(134,84,0,0.1)',
    title: 'Stay aligned.',
    body: 'Your 1:1s and cadences are structured touchpoints with your manager. Show up prepared. Track what was agreed. Close the loop.',
    features: [
      { icon: 'history', label: '1:1 History', description: 'What was agreed' },
      { icon: 'check_circle', label: 'Close Loops', description: 'Track follow-through' },
    ],
  },
]

const OBSERVER_STEPS: Step[] = [
  {
    icon: 'architecture',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'Welcome to Kairos.',
    body: "High-level visibility into what's moving. You're here to watch the pulse — team performance, revenue metrics, and execution health.",
    features: [
      { icon: 'monitoring', label: 'Exec Dashboard', description: 'Key metrics at a glance' },
      { icon: 'insights', label: 'Revenue Pulse', description: 'GMV and targets' },
    ],
  },
  {
    icon: 'dashboard',
    iconColor: 'var(--primary)',
    iconBg: 'rgba(0,83,219,0.1)',
    title: 'The Dashboard.',
    body: 'Key metrics and team progress at a glance. Task completion rates, overdue items, and revenue KPIs updated in real time.',
    features: [
      { icon: 'trending_up', label: 'Revenue KPIs', description: 'Live GMV tracking' },
      { icon: 'group', label: 'Team Pulse', description: 'Completion health' },
    ],
  },
  {
    icon: 'bar_chart',
    iconColor: '#526074',
    iconBg: 'rgba(82,96,116,0.1)',
    title: 'Metrics.',
    body: 'OTA channel data, check-in GMV, and targets tracked week over week. The numbers that matter, without noise.',
    features: [
      { icon: 'hotel', label: 'OTA Channels', description: 'Booking data' },
      { icon: 'calendar_month', label: 'Check-in GMV', description: 'Week-over-week' },
    ],
  },
  {
    icon: 'description',
    iconColor: 'var(--tertiary)',
    iconBg: 'rgba(134,84,0,0.1)',
    title: 'Reports.',
    body: 'Weekly Kairos Briefs summarize team progress, task completion, and flag what needs executive attention.',
    features: [
      { icon: 'summarize', label: 'Weekly Briefs', description: 'Auto-generated summaries' },
      { icon: 'flag', label: 'Escalations', description: 'What needs attention' },
    ],
  },
]

function getSteps(role: Role): Step[] {
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') return OPERATOR_STEPS
  if (role === 'EXEC_VIEWER' || role === 'GUEST') return OBSERVER_STEPS
  return CONTRIBUTOR_STEPS
}

function getRoleBadgeLabel(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'SUPER_ADMIN Access'
    case 'MANAGER': return 'Manager Access'
    case 'EXEC_VIEWER': return 'Executive View'
    case 'GUEST': return 'Guest Access'
    case 'SENIOR_IC': return 'Senior Contributor'
    default: return 'Contributor Access'
  }
}

function getSidebarText(role: Role): { title: string; description: string } {
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') {
    return {
      title: 'The Orchestrated Ledger awaits.',
      description: 'System architecture initialized. You have been granted full sovereignty over workspace nodes.',
    }
  }
  if (role === 'EXEC_VIEWER' || role === 'GUEST') {
    return {
      title: 'Executive visibility, activated.',
      description: 'Your read-only view into team execution, revenue metrics, and progress reporting.',
    }
  }
  return {
    title: 'Your work, organized.',
    description: 'Tasks, notes, and check-ins in one place. Kairos helps you stay focused and aligned.',
  }
}

// ─── OnboardingController — auto-launches on first login ─────────────────────

export function OnboardingController() {
  const { launch } = useOnboarding()

  useEffect(() => {
    fetch('/api/user/onboarding')
      .then(r => r.json())
      .then(({ data }) => {
        if (data && !data.completed) {
          setTimeout(launch, 600)
        }
      })
      .catch(() => {})
  }, [launch])

  return null
}

// ─── OnboardingModal ──────────────────────────────────────────────────────────

export function OnboardingModal() {
  const { open, close } = useOnboarding()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role>('DIRECT_REPORT')
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    setStep(0)
    fetch('/api/user/onboarding')
      .then(r => r.json())
      .then(({ data }) => { if (data?.role) setRole(data.role as Role) })
      .catch(() => {})
  }, [open])

  const steps = getSteps(role)
  const current = steps[step]
  const isLast = step === steps.length - 1
  const sidebarText = getSidebarText(role)

  const markComplete = useCallback(async () => {
    await fetch('/api/user/onboarding', { method: 'PATCH' }).catch(() => {})
  }, [])

  const handleDone = useCallback(async () => {
    await markComplete()
    close()
  }, [markComplete, close])

  const handleSkip = useCallback(async () => {
    await markComplete()
    close()
  }, [markComplete, close])

  const handleStartTour = useCallback(async () => {
    await markComplete()
    close()
    const firstRoute =
      role === 'SUPER_ADMIN' || role === 'MANAGER' ? '/?tour=1'
      : role === 'EXEC_VIEWER' || role === 'GUEST' ? '/?tour=1'
      : '/my-tasks?tour=1'
    router.push(firstRoute)
  }, [markComplete, close, role, router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(42,52,57,0.2)' }}
        onClick={handleSkip}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full flex flex-col md:flex-row overflow-hidden"
        style={{
          maxWidth: 680,
          minHeight: 520,
          background: 'var(--surface-container-lowest)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
          borderRadius: 12,
        }}
      >
        {/* Left sidebar */}
        <div
          className="w-full md:w-5/12 p-8 flex flex-col justify-between"
          style={{
            background: 'var(--surface-container)',
            borderRight: '1px solid rgba(169,180,185,0.1)',
          }}
        >
          <div className="space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}
              >
                architecture
              </span>
              <h1
                className="font-extrabold text-xl tracking-tight"
                style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
              >
                KAIROS
              </h1>
            </div>
            <div className="space-y-2">
              <span
                className="inline-block px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase"
                style={{ background: 'rgba(0,83,219,0.08)', color: 'var(--primary)' }}
              >
                {getRoleBadgeLabel(role)}
              </span>
              <h2
                className="text-2xl font-bold leading-tight"
                style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
              >
                {sidebarText.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
                {sidebarText.description}
              </p>
            </div>
          </div>

          {/* Image placeholder */}
          <div
            className="relative mt-8 rounded-lg overflow-hidden flex items-center justify-center"
            style={{ height: 120, background: 'var(--surface-container-high)' }}
          >
            <div
              className="flex flex-col items-center gap-2 opacity-40"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              <span className="material-symbols-outlined text-4xl">account_tree</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Workspace Graph</span>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="w-full md:w-7/12 p-10 flex flex-col justify-between">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 transition-colors"
            style={{ color: 'var(--outline)' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Step content */}
          <div className="space-y-7">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: current.iconBg }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{ color: current.iconColor }}
              >
                {current.icon}
              </span>
            </div>

            {/* Text */}
            <div className="space-y-3">
              <h3
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
              >
                {current.title}
              </h3>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                {current.body}
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3">
              {current.features.map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{
                    background: 'var(--surface-container-low)',
                    border: '1px solid rgba(169,180,185,0.05)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-sm block mb-1"
                    style={{ color: i === 0 ? 'var(--primary)' : 'var(--tertiary)' }}
                  >
                    {f.icon}
                  </span>
                  <div
                    className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {f.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--on-surface)', opacity: 0.8 }}>
                    {f.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-8">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? 16 : 6,
                    height: 6,
                    background: i === step
                      ? 'var(--primary)'
                      : i < step
                      ? 'rgba(0,83,219,0.3)'
                      : 'var(--outline-variant)',
                  }}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-sm font-semibold transition-colors"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                Skip
              </button>
              <button
                onClick={isLast ? handleStartTour : () => setStep(s => s + 1)}
                className="px-6 py-2.5 rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), #0048c1)',
                  color: 'var(--on-primary)',
                }}
              >
                {isLast ? 'Get Started' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
