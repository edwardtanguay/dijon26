import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { challengeText, text, type, contactId, rank } = body

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID de défi manquant.',
      })
    }

    const updateData: any = {}

    const rawText = challengeText !== undefined ? challengeText : text
    if (rawText !== undefined) {
      if (typeof rawText !== 'string' || !rawText.trim()) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Le texte du défi ne peut pas être vide.',
        })
      }
      updateData.challengeText = rawText.trim()
    }

    if (type !== undefined) {
      if (!['written', 'spoken'].includes(type)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Type invalide (doit être "written" ou "spoken").',
        })
      }
      updateData.type = type
    }

    if (contactId !== undefined) {
      updateData.contactId = contactId
    }

    if (rank !== undefined && rank !== null) {
      const num = parseFloat(rank)
      if (!isNaN(num) && num >= 0 && num <= 5) {
        updateData.rank = Math.round(num * 10) / 10
      }
    }

    if (body.afterChallengeNotes !== undefined) {
      updateData.afterChallengeNotes = body.afterChallengeNotes ? String(body.afterChallengeNotes).trim() : null
    }

    if (body.selectedForDate !== undefined) {
      updateData.selectedForDate = body.selectedForDate ? String(body.selectedForDate).trim() : null
    }

    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: updateData,
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
      statusMessage: 'Erreur lors de la modification du défi',
      data: error,
    })
  }
})
