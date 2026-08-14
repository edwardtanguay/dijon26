import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const settings = await prisma.appSetting.findMany()
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, string>)

    return {
      success: true,
      data: {
        dailyChallengeTarget: parseInt(settingsMap['daily_challenge_target'] || '10', 10),
        ...settingsMap,
      },
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des paramètres',
      data: error,
    })
  }
})
