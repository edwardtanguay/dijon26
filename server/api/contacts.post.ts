import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, name, email, telephone, description, mapUrl } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Le nom du contact est obligatoire.',
      })
    }

    if (id) {
      // Update
      const updated = await prisma.contact.update({
        where: { id },
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          telephone: telephone?.trim() || null,
          description: description?.trim() || null,
          mapUrl: mapUrl?.trim() || null,
        },
      })
      return { success: true, data: updated }
    } else {
      // Create
      const created = await prisma.contact.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          telephone: telephone?.trim() || null,
          description: description?.trim() || null,
          mapUrl: mapUrl?.trim() || null,
        },
      })
      return { success: true, data: created }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de l’enregistrement du contact',
      data: error,
    })
  }
})
