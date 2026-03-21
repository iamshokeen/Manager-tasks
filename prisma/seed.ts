// prisma/seed.ts
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Team Members
  await prisma.teamMember.upsert({
    where: { id: 'seed-analyst' },
    update: {},
    create: {
      id: 'seed-analyst',
      name: 'Junior Analyst / PM',
      role: 'Analytics & Program Management',
      department: 'Analytics',
      status: 'active',
      skills: 'PostgreSQL, N8N Automation, Data Analysis',
      oneOnOneDay: 'Monday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'PM responsibilities shared with VP. Strong technically. Coach on stakeholder communication and business judgment.',
      delegationLevel: 2,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-revenue-mgr' },
    update: {},
    create: {
      id: 'seed-revenue-mgr',
      name: 'Junior Revenue Manager',
      role: 'Revenue Management — Last-Minute & Weekday',
      department: 'Revenue',
      status: 'hiring',
      skills: 'Last-minute bookings, Weekday occupancy optimization',
      oneOnOneDay: 'Tuesday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Hiring target: May 2026. Focus: weekday fill rates, last-minute inventory liquidation.',
      delegationLevel: 1,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-kam1' },
    update: {},
    create: {
      id: 'seed-kam1',
      name: 'OTA KAM #1',
      role: 'Key Account Manager — MakeMyTrip',
      department: 'OTA',
      status: 'active',
      skills: 'MakeMyTrip relationship management, Campaign management, Rate negotiations',
      oneOnOneDay: 'Wednesday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Primary MMT relationship owner. MMT = 80% of OTA revenue. Strategic priority. Delegation level 3.',
      delegationLevel: 3,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-kam2' },
    update: {},
    create: {
      id: 'seed-kam2',
      name: 'OTA KAM #2',
      role: 'Key Account Manager — Affiliate OTAs',
      department: 'OTA',
      status: 'active',
      skills: 'Booking.com, Agoda, Airbnb, Marriott, HyperGuest relationship management',
      oneOnOneDay: 'Thursday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Manages all non-MMT OTAs. Focus on diversification. Delegation level 3.',
      delegationLevel: 3,
    },
  })

  await prisma.teamMember.upsert({
    where: { id: 'seed-ota-junior' },
    update: {},
    create: {
      id: 'seed-ota-junior',
      name: 'OTA Junior Resource',
      role: 'OTA Operations & CRM',
      department: 'OTA',
      status: 'active',
      skills: 'CRM data entry, Booking calculations, Operations',
      oneOnOneDay: 'Friday',
      oneOnOneTime: '10:00 AM',
      coachingNotes: 'Records all OTA bookings into CRM. KPIs: accuracy rate, processing speed, zero data discrepancies. Needs clear SOPs.',
      delegationLevel: 1,
    },
  })

  console.log('✓ Team members seeded')

  // Stakeholders
  const stakeholders = [
    {
      id: 'seed-home-vp',
      name: 'Home VP',
      title: 'Vice President',
      frequency: 'Weekly',
      channel: '1:1 + Slack',
      priority: 'critical',
      context: 'Direct reporting line. PM resource is shared with VP. No surprises ever.',
      strategy: 'Over-communicate. Send weekly async update (5 bullets max). Pre-wire all decisions. This is your shield and sponsor.',
    },
    {
      id: 'seed-cbo',
      name: 'CBO',
      title: 'Chief Business Officer',
      frequency: 'Bi-weekly',
      channel: '1:1 Meeting',
      priority: 'high',
      context: 'Revenue targets alignment, business strategy, market positioning.',
      strategy: 'Lead with revenue numbers and business impact. Speak their language — growth, market share, competitive positioning.',
    },
    {
      id: 'seed-finance-head',
      name: 'Finance Head',
      title: 'Head of Finance',
      frequency: 'Monthly',
      channel: 'Meeting + Excel',
      priority: 'high',
      context: 'Financial modeling reviews, budget approvals, EMI analysis, cost-benefit models.',
      strategy: 'Be precise. Double-check every number. Bring models in Excel. Frame everything as investment vs return.',
    },
    {
      id: 'seed-tech-head',
      name: 'Tech Dev Head',
      title: 'Head of Technology',
      frequency: 'As needed',
      channel: 'Slack + Meeting',
      priority: 'medium',
      context: 'Tech requirements for CRM, automation, integrations, dashboard infrastructure.',
      strategy: 'Be clear on requirements. Bring solutions with specs, not just problems. Respect their sprint cycles.',
    },
    {
      id: 'seed-cfo',
      name: 'CFO',
      title: 'Chief Financial Officer',
      frequency: 'Monthly',
      channel: 'Presentation',
      priority: 'high',
      context: 'Financial reporting, ROI analysis, strategic cost decisions.',
      strategy: 'Think ROI. Frame everything as investment vs return. Prepare Board-ready numbers.',
    },
    {
      id: 'seed-ceo',
      name: 'CEO / Founder',
      title: 'CEO & Founder',
      frequency: 'Monthly',
      channel: 'Presentation',
      priority: 'critical',
      context: 'Strategic updates, key decisions, board-level reporting.',
      strategy: 'Big picture ONLY. 3 bullet points max: What\'s winning, what needs help, what do you need from them.',
    },
  ]

  for (const s of stakeholders) {
    await prisma.stakeholder.upsert({ where: { id: s.id }, update: {}, create: s })
  }
  console.log('✓ Stakeholders seeded')

  // Cadences
  await prisma.cadence.upsert({
    where: { id: 'seed-standup' },
    update: {},
    create: {
      id: 'seed-standup',
      name: 'Weekly Team Standup',
      type: 'weekly_standup',
      day: 'Monday',
      time: '9:00 AM',
      duration: 15,
      scope: 'All Team',
      description: '15-min standup. Each person shares: done, doing, blocked. No discussion — park items for 1:1s.',
      prepItems: {
        create: [
          { title: 'Review all team task statuses', leadTimeDays: 0 },
          { title: "Prepare week's priority announcements", leadTimeDays: 0 },
        ],
      },
    },
  })

  await prisma.cadence.upsert({
    where: { id: 'seed-ota-review' },
    update: {},
    create: {
      id: 'seed-ota-review',
      name: 'OTA Department Review',
      type: 'dept_review',
      day: 'Wednesday',
      time: '2:00 PM',
      duration: 45,
      scope: 'OTA Team (KAM #1, KAM #2, Junior)',
      description: 'Campaign performance review, MMT updates, booking pipeline, affiliate OTA status, CRM data quality check.',
      prepItems: {
        create: [
          { title: 'Pull OTA gross booking numbers YTD vs ₹5Cr target', leadTimeDays: 1 },
          { title: 'Check MMT campaign performance dashboard', leadTimeDays: 1 },
          { title: 'Review CRM booking accuracy report', leadTimeDays: 1 },
          { title: 'Prepare affiliate OTA revenue split breakdown', leadTimeDays: 1 },
        ],
      },
    },
  })

  await prisma.cadence.upsert({
    where: { id: 'seed-rev-analytics' },
    update: {},
    create: {
      id: 'seed-rev-analytics',
      name: 'Revenue + Analytics Review',
      type: 'dept_review',
      day: 'Thursday',
      time: '2:00 PM',
      duration: 45,
      scope: 'Revenue + Analytics',
      description: 'Dashboard reviews, occupancy metrics, pricing performance, weekday fill rates, automation pipeline status.',
      prepItems: {
        create: [
          { title: 'Pull check-in revenue vs ₹85Cr target tracker', leadTimeDays: 1 },
          { title: 'Review weekday vs weekend occupancy splits', leadTimeDays: 1 },
          { title: 'Check pricing anomaly alerts', leadTimeDays: 1 },
          { title: 'Review N8N automation pipeline status', leadTimeDays: 1 },
        ],
      },
    },
  })

  await prisma.cadence.upsert({
    where: { id: 'seed-monthly-retro' },
    update: {},
    create: {
      id: 'seed-monthly-retro',
      name: 'Monthly Team Retrospective',
      type: 'monthly_review',
      day: 'Last Friday',
      time: '3:00 PM',
      duration: 60,
      scope: 'All Team',
      description: 'Monthly retro: wins, learnings, next month priorities. Celebrate achievements. Review OKR progress.',
      prepItems: {
        create: [
          { title: 'Compile monthly wins for each team member', leadTimeDays: 3 },
          { title: 'Prepare monthly revenue & OTA dashboard', leadTimeDays: 2 },
          { title: 'Draft next month priority list', leadTimeDays: 2 },
          { title: 'Review individual OKR progress', leadTimeDays: 3 },
        ],
      },
    },
  })

  await prisma.cadence.upsert({
    where: { id: 'seed-quarterly-review' },
    update: {},
    create: {
      id: 'seed-quarterly-review',
      name: 'Quarterly Performance Review',
      type: 'quarterly_review',
      day: 'Quarter End',
      time: 'Full Day',
      duration: 60,
      scope: 'Individual',
      description: 'Formal performance review. Goals assessment, development plan, feedback exchange (SBI model). Career development discussion.',
      prepItems: {
        create: [
          { title: 'Complete quarterly goal assessment per person', leadTimeDays: 7 },
          { title: 'Prepare SBI feedback notes per person', leadTimeDays: 5 },
          { title: 'Draft development plan updates', leadTimeDays: 5 },
          { title: 'Review 1:1 mood trends for each person', leadTimeDays: 3 },
        ],
      },
    },
  })

  console.log('✓ Cadences seeded')
  console.log('Seed complete ✓')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
