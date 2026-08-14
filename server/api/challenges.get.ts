import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { contactId, type } = query

    const where: any = {}

    if (contactId && typeof contactId === 'string') {
      where.contactId = contactId
    }

    if (type && typeof type === 'string') {
      where.type = type
    }

    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        contact: true,
      },
      orderBy: [
        { rank: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return {
      success: true,
      data: challenges,
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des défis',
      data: error,
    })
  }
})
