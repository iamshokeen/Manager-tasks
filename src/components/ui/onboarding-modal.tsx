// src/components/ui/onboarding-modal.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/context/onboarding-context'
import { KairosMark } from '@/components/ui/kairos-logo'
import {
  LayoutDashboard, CheckSquare, Users, Bell,
  ListTodo, StickyNote, MessageSquare, BarChart3, FileText,
  ArrowRight, ArrowLeft, X, Sparkles,
} from 'lucide-react'

// ─── Step definitions ─────────────────────────────────────────────────────────

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'SENIOR_IC' | 'DIRECT_REPORT' | 'EXEC_VIEWER' | 'GUEST'

interface Step {
  Icon: React.ElementType | 'kairos'
  title: string
  body: string
}

const OPERATOR_STEPS: Step[] = [
  {
    Icon: 'kairos',
    title: 'Welcome to Kairos.',
    body: "You're the operator. Kairos helps you decide, delegate, and close every loop. Each section is built around one thing: your next right move.",
  },
  {
    Icon: LayoutDashboard,
    title: 'Your command center.',
    body: "The Dashboard surfaces what needs your attention right now — overdue tasks, team pulse, this week's cadences, and revenue KPIs. Start here every morning.",
  },
  {
    Icon: CheckSquare,
    title: 'Tasks move on the board.',
    body: 'Drop tasks, assign them to your people, set priorities. The Kanban board shows where everything stands. Use "Drop a Task" for anything that needs to move.',
  },
  {
    Icon: Users,
    title: 'Your People.',
    body: 'Your direct reports, their 1:1s, and their cadences — all in one place. Track follow-through without micromanaging. Build the habit of structured check-ins.',
  },
  {
    Icon: Bell,
    title: 'Open Loops.',
    body: "Every thread that can't close yet lives here. Snooze what isn't urgent. Convert to task when it's time to act. Nothing falls through.",
  },
  {
    Icon: Sparkles,
    title: 'Telos is your execution layer.',
    body: "If it doesn't need you, Telos can do it. Use AI inside tasks and projects to generate work, summarize progress, and parse action items — fast.",
  },
]

const CONTRIBUTOR_STEPS: Step[] = [
  {
    Icon: 'kairos',
    title: 'Welcome to Kairos.',
    body: 'Your work, organized. Kairos keeps your assigned tasks, notes, and check-ins in one place so nothing gets lost and nothing surprises you.',
  },
  {
    Icon: ListTodo,
    title: 'My Tasks.',
    body: 'Everything assigned to you lives here. Sorted by priority and due date. Start here each day — it is your personal execution list.',
  },
  {
    Icon: StickyNote,
    title: 'Notes.',
    body: 'Capture context, meeting notes, and decisions. Notes attach to tasks, projects, and people. Write it down once — find it anywhere.',
  },
  {
    Icon: MessageSquare,
    title: 'Stay aligned.',
    body: 'Your 1:1s and cadences are structured touchpoints with your manager. Show up prepared. Track what was agreed. Close the loop.',
  },
]

const OBSERVER_STEPS: Step[] = [
  {
    Icon: 'kairos',
    title: 'Welcome to Kairos.',
    body: "High-level visibility into what's moving. You're here to watch the pulse — team performance, revenue metrics, and execution health.",
  },
  {
    Icon: LayoutDashboard,
    title: 'The Dashboard.',
    body: 'Key metrics and team progress at a glance. Task completion rates, overdue items, and revenue KPIs updated in real time.',
  },
  {
    Icon: BarChart3,
    title: 'Metrics.',
    body: 'OTA channel data, check-in GMV, and targets tracked week over week. The numbers that matter, without noise.',
  },
  {
    Icon: FileText,
    title: 'Reports.',
    body: 'Weekly Kairos Briefs summarize team progress, task completion, and flag what needs executive attention.',
  },
]

function getSteps(role: Role): Step[] {
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') return OPERATOR_STEPS
  if (role === 'EXEC_VIEWER' || role === 'GUEST') return OBSERVER_STEPS
  return CONTRIBUTOR_STEPS
}

function getTier(role: Role): string {
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') return 'Operator Tour'
  if (role === 'EXEC_VIEWER' || role === 'GUEST') return 'Observer Tour'
  return 'Contributor Tour'
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

  // Reset step and fetch role each time modal opens
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
  const isFirst = step === 0
  const isLast = step === steps.length - 1

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0c0c18]/85 backdrop-blur-sm" onClick={handleSkip} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#1a1a28] border border-[rgba(201,169,110,0.15)] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.7)] overflow-hidden">

        {/* Gold top accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            <KairosMark size={16} />
            <span className="text-[10px] font-subhead uppercase tracking-[0.2em] text-[#c9a96e]">
              {getTier(role)}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--outline)] hover:text-[#f2ede8] hover:bg-[var(--surface-container-high)] transition-all"
          >
            <X size={13} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-7">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-container-high)] border border-[rgba(201,169,110,0.1)] flex items-center justify-center mb-5">
            {current.Icon === 'kairos'
              ? <KairosMark size={26} />
              : <current.Icon size={20} color="#c9a96e" strokeWidth={1.5} />
            }
          </div>

          {/* Text */}
          <h2 className="font-serif text-2xl text-[#f2ede8] mb-3 leading-snug">
            {current.title}
          </h2>
          <p className="text-sm text-[var(--outline)] leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-5 h-1.5 bg-[#c9a96e]'
                    : i < step
                    ? 'w-1.5 h-1.5 bg-[#c9a96e]/35 hover:bg-[#c9a96e]/60'
                    : 'w-1.5 h-1.5 bg-[var(--surface-container-highest)] hover:bg-[var(--outline)]/30'
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {isFirst && (
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-sm text-[var(--outline)] hover:text-[#f2ede8] transition-colors rounded-lg"
              >
                Skip
              </button>
            )}
            {!isFirst && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--outline)] hover:text-[#f2ede8] transition-colors rounded-lg hover:bg-[var(--surface-container-high)]"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            )}
            <button
              onClick={isLast ? handleDone : () => setStep(s => s + 1)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-[#c9a96e] text-[#0c0c18] rounded-lg hover:bg-[#d4b87a] transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ArrowRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
