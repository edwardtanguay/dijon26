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

  // Seed AppSetting
  await prisma.appSetting.upsert({
    where: { key: 'daily_challenge_target' },
    update: {},
    create: {
      key: 'daily_challenge_target',
      value: '10',
    },
  })
  console.log('✔ AppSetting daily_challenge_target seeded.')

  // Clear existing challenges & contacts for clean test seed
  await prisma.challenge.deleteMany()
  await prisma.contact.deleteMany()

  const contactBeauxArts = await prisma.contact.create({
    data: {
      name: 'Musée des Beaux-Arts de Dijon',
      email: 'contact@mba-dijon.fr',
      telephone: '03 80 74 52 09',
      description: 'Palais des Ducs et des États de Bourgogne, place de la Sainte-Chapelle.',
    },
  })

  const contactCAF = await prisma.contact.create({
    data: {
      name: 'Club Alpin Français de Dijon',
      email: 'contact@cafdijon.fr',
      telephone: '03 80 30 12 34',
      description: 'Club de randonnée, escalade et montagne à Dijon.',
    },
  })

  const contactOT = await prisma.contact.create({
    data: {
      name: 'Office de Tourisme de Dijon Métropole',
      email: 'info@destinationdijon.com',
      telephone: '08 92 70 05 58',
      description: 'Point d’accueil rue des Forges et gare.',
    },
  })

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Seed some challenges for today (completed and pending)
  await prisma.challenge.create({
    data: {
      contactId: contactBeauxArts.id,
      text: 'Demander par e-mail le calendrier des visites guidées thématiques de la rentrée',
      type: 'written',
      scheduledFor: new Date(`${todayStr}T09:00:00.000Z`),
      completedAt: new Date(`${todayStr}T10:15:00.000Z`),
      afterChallengeNotes: 'E-mail envoyé ce matin. Demande faite pour le parcours Moyen-Âge. Réponse automatique reçue, en attente du guide.',
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactOT.id,
      text: 'Appeler pour connaître les horaires du parcours de la Chouette et le tarif des livrets',
      type: 'spoken',
      scheduledFor: new Date(`${todayStr}T11:00:00.000Z`),
      completedAt: new Date(`${todayStr}T11:30:00.000Z`),
      afterChallengeNotes: 'Appel très fluide. Accueil chaleureux, livret à 4€ disponible directement au guichet.',
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactCAF.id,
      text: 'Écrire pour demander les conditions d’inscription et le programme des sorties débutants',
      type: 'written',
      scheduledFor: new Date(`${todayStr}T14:00:00.000Z`),
      completedAt: null,
      afterChallengeNotes: null,
    },
  })

  // Seed challenges for tomorrow
  await prisma.challenge.create({
    data: {
      contactId: contactBeauxArts.id,
      text: 'Contacter le responsable pédagogique pour les ateliers de dessin du samedi',
      type: 'written',
      scheduledFor: new Date(`${tomorrowStr}T09:00:00.000Z`),
      completedAt: null,
      afterChallengeNotes: null,
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactCAF.id,
      text: 'Appeler le club pour confirmer le lieu de rendez-vous de la randonnée dimanche',
      type: 'spoken',
      scheduledFor: new Date(`${tomorrowStr}T15:00:00.000Z`),
      completedAt: null,
      afterChallengeNotes: null,
    },
  })

  console.log('✔ Contacts and challenges seeded.')
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
