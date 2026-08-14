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
      text,
      type,
      scheduledFor,
    } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le texte du défi est requis.',
      })
    }

    if (text.trim().length > 255) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le texte du défi ne doit pas dépasser 255 caractères.',
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

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date()

    const challenge = await prisma.challenge.create({
      data: {
        contactId: finalContactId,
        text: text.trim(),
        type,
        scheduledFor: scheduledDate,
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
