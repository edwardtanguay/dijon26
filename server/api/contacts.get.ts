import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        challenges: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return {
      success: true,
      data: contacts,
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des contacts',
      data: error,
    })
  }
})
