import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      contactId,
      newContactName,
      newContactEmail,
      newContactPhone,
      newContactDescription,
      newContactMapUrl,
      newContactUrl,
      challengeText,
      text,
      type,
      rank,
    } = body

    const rawText = challengeText || text

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le texte du défi est requis.',
      })
    }

    if (!type || !['written', 'spoken'].includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le type de défi doit être "written" ou "spoken".',
      })
    }

    let finalContactId = contactId

    // If a new contact name is supplied instead of an existing ID
    if (!finalContactId && newContactName && typeof newContactName === 'string' && newContactName.trim()) {
      const createdContact = await prisma.contact.create({
        data: {
          name: newContactName.trim(),
          email: newContactEmail?.trim() || null,
          telephone: newContactPhone?.trim() || null,
          description: newContactDescription?.trim() || null,
          mapUrl: newContactMapUrl?.trim() || null,
          url: newContactUrl?.trim() || null,
        },
      })
      finalContactId = createdContact.id
    }

    if (!finalContactId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Un contact associé est requis pour ce défi.',
      })
    }

    let parsedRank = 2.5
    if (rank !== undefined && rank !== null) {
      const num = parseFloat(rank)
      if (!isNaN(num) && num >= 0 && num <= 5) {
        parsedRank = Math.round(num * 10) / 10
      }
    }

    let selectedForDateVal: string | null = null
    if (body.selectedForDate !== undefined) {
      selectedForDateVal = body.selectedForDate ? String(body.selectedForDate).trim() : null
    }

    const challenge = await prisma.challenge.create({
      data: {
        contactId: finalContactId,
        challengeText: rawText.trim(),
        type,
        rank: parsedRank,
        selectedForDate: selectedForDateVal,
      },
      include: {
        contact: true,
      },
    })

    return {
      success: true,
      data: challenge,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la création du défi',
      data: error,
    })
  }
})
