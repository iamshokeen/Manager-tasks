'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

function PlaybookSection({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false)
  const parsed = content.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-card hover:bg-card/80 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-border">
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {parsed}
          </div>
        </div>
      )}
    </div>
  )
}

const SECTIONS = [
  {
    title: '5Cs Framework',
    content: `The 5Cs help you diagnose why someone isn't performing.

**Context** — Do they understand the why? Share the bigger picture.
**Clarity** — Are expectations crystal clear? Define done explicitly.
**Competence** — Do they have the skills? Train, pair, or reassign.
**Commitment** — Are they motivated? Address engagement and ownership.
**Communication** — Is there a feedback loop? Create regular check-ins.

Use this before assuming someone is underperforming. Most issues trace back to one of these five.`,
  },
  {
    title: '1:1 Meeting Mastery',
    content: `1:1s are your most important management tool. They belong to your direct report.

**Structure (30 min):**
5 min: Their wins and blockers
10 min: Their priorities this week
10 min: Your coaching, feedback, context
5 min: Action items recap

**Rules:**
Never cancel. Reschedule if needed.
Ask "What do you need from me?" every session.
Take notes. Review last session's action items.
Use SBI for any feedback you give.

**Signs of a good 1:1:** They bring the agenda. They leave with clarity. You learn something new.`,
  },
  {
    title: 'Delegation Framework (4 Levels)',
    content: `Match delegation level to competence and confidence per task.

**Level 1 — Do:** "Here's exactly what to do. Execute this."
Use for: New hires, critical low-margin-for-error work.

**Level 2 — Research:** "Investigate and bring me your findings. I'll decide."
Use for: Building analytical skills, low-stakes decisions.

**Level 3 — Decide:** "Analyze, make a recommendation. I'll approve."
Use for: Building decision-making, medium-stakes work.

**Level 4 — Own:** "This is yours. Update me on outcomes."
Use for: High performers, their domain expertise.

Delegation level is per-task, not per-person.`,
  },
  {
    title: 'SBI Feedback Model',
    content: `SBI makes feedback specific, objective, and actionable.

**Situation:** Describe the specific context. When and where.
"In yesterday's OTA review meeting..."

**Behavior:** Describe the observable behavior. Not interpretation.
"...you interrupted the KAM twice while they were presenting numbers..."

**Impact:** Describe the effect on you, the team, or the work.
"...which made them uncomfortable and the data wasn't fully heard."

**Then ask, don't tell:** "What was going on for you?"

**Positive SBI matters too.** Use it to reinforce what's working, not just to correct.`,
  },
  {
    title: 'Stakeholder Management Playbook',
    content: `Your stakeholders are your context providers, decision authorities, and career sponsors.

**The pre-wire rule:** Never surprise a senior stakeholder in a meeting. Pre-wire decisions 1:1 first.

**Weekly async update to your Home VP (5 bullets max):**
1. Revenue progress
2. Key win this week
3. Key challenge and how you're handling it
4. One risk to flag
5. One ask or decision needed

**Managing up:** Surface problems early. Bring solutions, not just problems. Make their job easier.`,
  },
  {
    title: 'First 90 Days Guide',
    content: `**Days 1–30: Listen and Learn**
Don't change anything. Understand the existing system first.
Have 1:1 kickoffs with each report: role, challenges, what they need.
Map your stakeholders. Identify what's on fire and what's being ignored.

**Days 31–60: Diagnose**
Use 5Cs to assess each person's delegation level.
Set initial goals and success metrics with each report.
Identify the 2-3 highest-leverage changes you can make.
Establish your cadence rhythm.

**Days 61–90: Deliver**
Execute on your highest-leverage changes.
Make your first visible win.
Calibrate delegation levels. Push ownership down.
Do a personal retro: What did you underestimate? What's working?`,
  },
  {
    title: 'Coaching vs Directing',
    content: `**Directing** (telling): You have the answer. Speed matters. Stakes are high.
"Here's exactly what to do: X, then Y, then Z by Friday."
Use when: New person, urgent situation, truly no time.

**Coaching** (asking): They probably have the answer. Growth matters more than speed.
"What do you think the right move is? What have you tried? What's stopping you?"
Use when: They have the capability, building ownership matters.

**The trap:** Experienced managers over-direct because it's faster short-term. But directing creates dependency. Coaching creates capability.

**For your team:** KAMs (level 3) should be coached. Junior OTA resource (level 1) needs more directing for now.`,
  },
  {
    title: 'Managing Multiple Departments',
    content: `You manage 5 people across 6 departments. This requires context-switching discipline.

**Each department has its own rhythm:** Don't apply OTA logic to Analytics. Don't apply Revenue logic to Finance.

**Weekly cadence:**
Monday standup: All team, week priorities
Wednesday: OTA deep-dive (MMT, campaigns, booking pipeline)
Thursday: Revenue + Analytics (occupancy, pricing, automation)
Monthly retro: Reflect, recalibrate, celebrate wins

**Cognitive load management:** Use this app to maintain context between meetings. Your notes and action items are your external memory. Review before each 1:1 and department review.`,
  },
]

export default function PlaybookPage() {
  return (
    <div>
      <PageHeader title="Playbook" description="People management frameworks for daily reference" />
      <div className="space-y-2">
        {SECTIONS.map(s => (
          <PlaybookSection key={s.title} title={s.title} content={s.content} />
        ))}
      </div>
    </div>
  )
}
