import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID de contact manquant.',
      })
    }

    await prisma.contact.delete({
      where: { id },
    })

    return {
      success: true,
      data: { id },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la suppression du contact',
      data: error,
    })
  }
})
