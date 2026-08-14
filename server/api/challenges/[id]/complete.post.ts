import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { afterChallengeNotes, completedAt } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID de défi manquant.',
      })
    }

    const completionDate = completedAt ? new Date(completedAt) : new Date()

    const updated = await prisma.challenge.update({
      where: { id },
      data: {
        completedAt: completionDate,
        afterChallengeNotes: afterChallengeNotes?.trim() || null,
      },
      include: {
        contact: true,
      },
    })

    return {
      success: true,
      data: updated,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de l’enregistrement du bilan du défi',
      data: error,
    })
  }
})
