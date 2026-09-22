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
      mapUrl: 'https://maps.google.com/?q=Musee+des+Beaux-Arts+Dijon',
    },
  })

  const contactCAF = await prisma.contact.create({
    data: {
      name: 'Club Alpin Français de Dijon',
      email: 'contact@cafdijon.fr',
      telephone: '03 80 30 12 34',
      description: 'Club de randonnée, escalade et montagne à Dijon.',
      mapUrl: 'https://maps.google.com/?q=Club+Alpin+Francais+Dijon',
    },
  })

  const contactOT = await prisma.contact.create({
    data: {
      name: 'Office de Tourisme de Dijon Métropole',
      email: 'info@destinationdijon.com',
      telephone: '08 92 70 05 58',
      description: 'Point d’accueil rue des Forges et gare.',
      mapUrl: 'https://maps.google.com/?q=Office+de+Tourisme+Dijon',
    },
  })

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Seed challenges (some completed today, some completed in the past, and a pool of todo challenges)
  await prisma.challenge.create({
    data: {
      contactId: contactBeauxArts.id,
      challengeText: 'Demander par e-mail le calendrier des visites guidées thématiques de la rentrée ##beauxarts',
      type: 'written',
      rank: 4.5,
      completedAt: new Date(`${todayStr}T10:15:00.000Z`),
      afterChallengeNotes: 'E-mail envoyé ce matin. Demande faite pour le parcours Moyen-Âge. Réponse automatique reçue, en attente du guide.',
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactOT.id,
      challengeText: 'Appeler pour connaître les horaires du parcours de la Chouette et le tarif des livrets',
      type: 'spoken',
      rank: 3.8,
      completedAt: new Date(`${todayStr}T11:30:00.000Z`),
      afterChallengeNotes: 'Appel très fluide. Accueil chaleureux, livret à 4€ disponible directement au guichet.',
    },
  })

  // Past completed challenge
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  await prisma.challenge.create({
    data: {
      contactId: contactCAF.id,
      challengeText: 'Se renseigner sur la permanence hebdomadaire du club et les adhésions',
      type: 'spoken',
      rank: 2.5,
      completedAt: pastDate,
      afterChallengeNotes: 'Permanence tous les jeudis soirs de 18h à 20h. Très accueillants.',
    },
  })

  // Todo pool challenges
  await prisma.challenge.create({
    data: {
      contactId: contactCAF.id,
      challengeText: 'Écrire pour demander les conditions d’inscription et le programme des sorties débutants',
      type: 'written',
      rank: 4.8,
      completedAt: null,
      afterChallengeNotes: null,
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactBeauxArts.id,
      challengeText: 'Contacter le responsable pédagogique pour les ateliers de dessin du samedi',
      type: 'written',
      rank: 3.2,
      completedAt: null,
      afterChallengeNotes: null,
    },
  })

  await prisma.challenge.create({
    data: {
      contactId: contactCAF.id,
      challengeText: 'Appeler le club pour confirmer le lieu de rendez-vous de la randonnée dimanche',
      type: 'spoken',
      rank: 2.0,
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
