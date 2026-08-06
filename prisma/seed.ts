import 'dotenv/config'
import { PrismaClient } from '../server/prisma/client/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const url = process.env.DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN

if (!url) {
  console.error('DATABASE_URL is not defined in environment.')
  process.exit(1)
}

const adapter = new PrismaLibSql({ url, authToken })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...')

  // Seed DbTest
  const dbTest = await prisma.dbTest.upsert({
    where: { id: 1 },
    update: { status: 'off' },
    create: { id: 1, status: 'off' },
  })
  console.log('✔ DbTest seeded:', dbTest)

  // Clear existing tasks and seed fresh demo tasks
  await prisma.task.deleteMany()

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Complete Nuxt 3 & Prisma integration',
        completed: true,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Verify Turso database seeder functionality',
        completed: true,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build Dijon26 features',
        completed: false,
      },
    }),
  ])

  console.log(`✔ Seeded ${tasks.length} tasks.`)
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
