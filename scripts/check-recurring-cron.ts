import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)

  const totalTemplates = await prisma.recurringTaskTemplate.count()
  const activeTemplates = await prisma.recurringTaskTemplate.count({
    where: { isActive: true },
  })
  const recentlyGenerated = await prisma.recurringTaskTemplate.count({
    where: { lastGeneratedAt: { gte: sevenDaysAgo } },
  })
  const overdueTemplates = await prisma.recurringTaskTemplate.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    select: {
      id: true,
      title: true,
      nextRunAt: true,
      lastGeneratedAt: true,
      frequency: true,
    },
  })
  const recentRecurringTasks = await prisma.task.count({
    where: {
      source: 'recurring',
      createdAt: { gte: sevenDaysAgo },
    },
  })

  console.log('=== Recurring tasks health check ===')
  console.log(`Now: ${now.toISOString()}`)
  console.log(`Total RecurringTaskTemplates: ${totalTemplates}`)
  console.log(`  Active: ${activeTemplates}`)
  console.log(`  Generated in last 7 days: ${recentlyGenerated}`)
  console.log(`Tasks created via cron in last 7 days: ${recentRecurringTasks}`)
  console.log(`Active templates whose nextRunAt is in the past (should have fired): ${overdueTemplates.length}`)
  if (overdueTemplates.length > 0) {
    console.log('  Overdue templates:')
    for (const t of overdueTemplates.slice(0, 10)) {
      console.log(`    - [${t.id}] "${t.title}" (${t.frequency}) nextRunAt=${t.nextRunAt?.toISOString()} lastGeneratedAt=${t.lastGeneratedAt?.toISOString() ?? 'never'}`)
    }
  }

  if (totalTemplates === 0) {
    console.log('\nVerdict: No templates exist yet — nothing for the cron to do. Cron health: UNKNOWN.')
  } else if (overdueTemplates.length > 0) {
    console.log('\nVerdict: Templates exist that should have fired but did not. Cron health: LIKELY BROKEN.')
  } else if (activeTemplates > 0 && recentlyGenerated === 0) {
    console.log('\nVerdict: Active templates exist but nothing generated in 7 days. Could be normal (next run is in the future) or broken.')
  } else {
    console.log('\nVerdict: Cron appears to be firing.')
  }
}

main()
  .catch((e) => {
    console.error('Health check failed:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
