export const useNotesAuth = () => {
  const STORAGE_KEY_UNLOCKED = 'dijon_notes_unlocked'
  const isUnlocked = useState<boolean>('notes_unlocked', () => false)

  const initAuth = () => {
    if (import.meta.client) {
      try {
        isUnlocked.value = localStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true'
      } catch (e) {
        console.error('Erreur lors de la lecture du localStorage:', e)
      }
    }
  }

  const unlock = () => {
    isUnlocked.value = true
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true')
      } catch (e) {
        console.error('Erreur lors de la sauvegarde du déverrouillage:', e)
      }
    }
  }

  const lock = () => {
    isUnlocked.value = false
    if (import.meta.client) {
      try {
        localStorage.removeItem(STORAGE_KEY_UNLOCKED)
      } catch (e) {
        console.error('Erreur lors du verrouillage:', e)
      }
    }
  }

  return {
    isUnlocked,
    initAuth,
    unlock,
    lock
  }
}
