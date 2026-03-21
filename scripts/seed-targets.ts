import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseTargetsCsv } from '../src/lib/services/targets'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const csvPath = resolve('C:\\Users\\Saksham Shokeen\\Desktop\\FY 27\\AI projects\\Management tool\\Targets.csv')
  const csv = readFileSync(csvPath, 'utf-8')
  const data = parseTargetsCsv(csv)
  await prisma.setting.upsert({
    where: { key: 'targets' },
    update: { value: JSON.stringify(data) },
    create: { key: 'targets', value: JSON.stringify(data) },
  })
  console.log('Targets seeded successfully')
  console.log('OTA YTD revenue:', data.ota.ytd.revenue)
  console.log('Check-in YTD total:', data.checkin.ytd.total)
}

main().catch(console.error).finally(() => prisma.$disconnect())
