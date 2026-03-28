// src/components/ui/floating-tour-banner.tsx
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'

type TourStep = { route: string; title: string; body: string }

const OPERATOR_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Command Center',
    body: "Start every morning here. See what needs attention — overdue tasks, your team's open work, and this week's revenue.",
  },
  {
    route: '/tasks',
    title: 'Task Board',
    body: 'Drop tasks, assign to your people, drag to move between stages. Every open thread lives here.',
  },
  {
    route: '/team',
    title: 'Your People',
    body: "See each direct report's workload, track 1:1 notes, and monitor who's carrying what.",
  },
  {
    route: '/stakeholders',
    title: 'The Table',
    body: "Every stakeholder tracked — their context, channel preference, and what's in flight.",
  },
  {
    route: '/follow-ups',
    title: 'Open Loops',
    body: 'Anything unresolved lands here. Snooze it, convert it to a task, or close it.',
  },
]

const CONTRIBUTOR_STEPS: TourStep[] = [
  {
    route: '/my-tasks',
    title: 'My Tasks',
    body: 'Everything assigned to you, sorted by priority and due date. Start here every day.',
  },
  {
    route: '/tasks',
    title: 'Team Board',
    body: "See the full task board — where your work sits in the team's flow.",
  },
  {
    route: '/notes',
    title: 'Notes',
    body: 'Capture meeting context, decisions, and follow-ups. Attach notes to tasks and people.',
  },
  {
    route: '/follow-ups',
    title: 'Open Loops',
    body: 'Track anything waiting on a response or pending action.',
  },
]

const OBSERVER_STEPS: TourStep[] = [
  {
    route: '/',
    title: 'Command Center',
    body: 'Your visibility dashboard — task health, team pulse, and revenue KPIs.',
  },
  {
    route: '/metrics',
    title: 'Metrics',
    body: 'OTA and check-in revenue tracked week over week against targets.',
  },
  {
    route: '/reports',
    title: 'Reports',
    body: 'Weekly Kairos briefs summarising team progress and execution health.',
  },
]

function getSteps(role: string): TourStep[] {
  if (role === 'SUPER_ADMIN' || role === 'MANAGER') return OPERATOR_STEPS
  if (role === 'EXEC_VIEWER' || role === 'GUEST') return OBSERVER_STEPS
  return CONTRIBUTOR_STEPS
}

export function FloatingTourBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentUser = useCurrentUser()

  const tourParam = searchParams.get('tour')
  if (!tourParam) return null

  const step = parseInt(tourParam, 10)
  if (isNaN(step) || step < 1) return null

  const role = currentUser?.role ?? 'DIRECT_REPORT'
  const steps = getSteps(role)
  const total = steps.length
  const currentStepIndex = step - 1

  if (currentStepIndex >= total) return null

  const currentStep = steps[currentStepIndex]

  function endTour() {
    // Navigate to current path without ?tour param
    const currentPath = window.location.pathname
    router.push(currentPath)
  }

  function goBack() {
    if (step <= 1) return
    const prevStep = steps[step - 2]
    router.push(prevStep.route + '?tour=' + (step - 1))
  }

  function goNext() {
    if (step >= total) {
      endTour()
      return
    }
    const nextStep = steps[step]
    router.push(nextStep.route + '?tour=' + (step + 1))
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4">
      <div className="bg-[#1a1a28] border border-[rgba(201,169,110,0.25)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Gold top line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#c9a96e] to-transparent" />
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#c9a96e] font-['Jost']">
                Kairos Tour · Step {step} of {total}
              </div>
            </div>
            <button
              onClick={endTour}
              className="text-[#6b6b80] hover:text-[#f2ede8] text-xs cursor-pointer transition-colors"
            >
              End Tour
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-[rgba(255,255,255,0.06)] rounded-full mb-4">
            <div
              className="h-full bg-[#c9a96e] rounded-full transition-all"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
          {/* Content */}
          <h3 className="font-['Cormorant_Garamond'] text-xl text-[#f2ede8] mb-1">
            {currentStep.title}
          </h3>
          <p className="text-sm text-[#6b6b80] leading-relaxed">{currentStep.body}</p>
          {/* Nav */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="text-xs text-[#6b6b80] hover:text-[#f2ede8] disabled:opacity-30 cursor-pointer transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={goNext}
              className="px-4 py-1.5 bg-[#c9a96e] text-[#0c0c18] rounded-lg text-sm font-semibold hover:bg-[#d4b87a] transition-colors cursor-pointer"
            >
              {step === total ? 'Finish \u2713' : 'Next \u2192'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
