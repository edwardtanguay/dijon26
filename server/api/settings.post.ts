import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { key, value } = body

    if (!key || value === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Paramètres "key" et "value" requis.',
      })
    }

    const updatedSetting = await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return {
      success: true,
      data: updatedSetting,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la mise à jour du paramètre',
      data: error,
    })
  }
})
