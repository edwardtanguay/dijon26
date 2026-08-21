<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({
  title: 'Défis de communication réelle - Dijon 26',
  meta: [
    {
      name: 'description',
      content:
        'Utiliser et améliorer ton français pour accomplir des tâches concrètes et élargir ton réseau social',
    },
  ],
})

interface Contact {
  id: string
  name: string
  email: string | null
  telephone: string | null
  description: string | null
  mapUrl?: string | null
  url?: string | null
  createdAt: string
  updatedAt: string
  challenges?: Challenge[]
}

interface Challenge {
  id: string
  contactId: string
  contact?: Contact
  challengeText: string
  type: 'written' | 'spoken'
  rank: number
  completedAt: string | null
  selectedForDate?: string | null
  afterChallengeNotes: string | null
  createdAt: string
  updatedAt: string
}

// State
const challenges = ref<Challenge[]>([])
const contacts = ref<Contact[]>([])
const availableImages = ref<string[]>([])
const dailyTarget = ref<number>(10)
const isEditingTarget = ref(false)
const targetInput = ref<number>(10)
const loading = ref(true)

// Active Tab: contacts | finished | todo | history
const activeTab = ref<'contacts' | 'finished' | 'todo' | 'history'>('contacts')

// History accordion state (single day expanded at a time)
const expandedHistoryDate = ref<string | null>(null)

const toggleHistoryDate = (dateKey: string) => {
  if (expandedHistoryDate.value === dateKey) {
    expandedHistoryDate.value = null
  } else {
    expandedHistoryDate.value = dateKey
  }
}

// Search states
const searchContacts = ref('')
const searchFinished = ref('')

// History Computed: Group finished challenges by date descending
const historyByDay = computed(() => {
  const map: Record<string, Challenge[]> = {}
  for (const c of finishedChallenges.value) {
    if (!c.completedAt) continue
    const dateKey = getLocalDateString(c.completedAt)
    if (!map[dateKey]) {
      map[dateKey] = []
    }
    map[dateKey].push(c)
  }

  // Sort dates descending
  const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a))

  return sortedDates.map((dateKey) => {
    // Parse date parts to create local date object avoiding timezone shift
    const [y, m, d] = dateKey.split('-').map(Number)
    const dateObj = new Date(y!, m! - 1, d!)
    
    // Format: e.g. "ven. 14 août" or "Aujourd'hui"
    const isToday = dateKey === todayStr.value
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    return {
      dateKey,
      dateObj,
      formattedDate,
      isToday,
      challenges: map[dateKey] || [],
      count: (map[dateKey] || []).length,
      targetReached: (map[dateKey] || []).length >= (dailyTarget.value || 1)
    }
  })
})

// Modals state
const isContactModalOpen = ref(false)
const isEditingContact = ref(false)
const contactForm = ref({
  id: '',
  name: '',
  email: '',
  telephone: '',
  description: '',
  mapUrl: '',
  url: '',
})
const contactSubmitting = ref(false)

// Contact Challenges Modal (concise view)
const isContactChallengesModalOpen = ref(false)
const activeContactForChallenges = ref<Contact | null>(null)

// Challenge Form Modal (for Add / Edit)
const isChallengeModalOpen = ref(false)
const isEditingChallenge = ref(false)
const editingChallengeId = ref('')
const challengeForm = ref({
  contactMode: 'existing' as 'existing' | 'new',
  contactId: '',
  newContactName: '',
  newContactEmail: '',
  newContactPhone: '',
  newContactDescription: '',
  newContactMapUrl: '',
  newContactUrl: '',
  challengeText: '',
  type: 'written' as 'written' | 'spoken',
  rank: 2.5,
  isFinished: false,
  completedAt: '',
  afterChallengeNotes: '',
})
const challengeSubmitting = ref(false)

// Reflection Modal (when completing a todo challenge)
const isReflectModalOpen = ref(false)
const selectedChallengeForReflect = ref<Challenge | null>(null)
const reflectNotes = ref('')
const reflectCompletedAt = ref('')
const reflectSubmitting = ref(false)

// Detail Modal state (for viewing full info of a contact or challenge)
const isDetailModalOpen = ref(false)
const detailModalType = ref<'contact' | 'challenge'>('contact')
const selectedContactForDetail = ref<Contact | null>(null)
const selectedChallengeForDetail = ref<Challenge | null>(null)

const openContactDetailModal = (contact: Contact) => {
  selectedContactForDetail.value = contact
  detailModalType.value = 'contact'
  isDetailModalOpen.value = true
}

const openChallengeDetailModal = (challenge: Challenge) => {
  selectedChallengeForDetail.value = challenge
  detailModalType.value = 'challenge'
  isDetailModalOpen.value = true
}

const getCurrentTimestamp = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const formatDateForDisplay = (d: string | null | undefined) => {
  if (!d) return '—'
  const dateObj = new Date(d)
  if (isNaN(dateObj.getTime())) return d
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const seconds = String(dateObj.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Fetch Data
const fetchData = async (showLoading = false) => {
  if (showLoading) {
    loading.value = true
  }
  try {
    const [settingsRes, challengesRes, contactsRes, imagesRes] = await Promise.all([
      $fetch<{ success: boolean; data: any }>('/api/settings'),
      $fetch<{ success: boolean; data: Challenge[] }>('/api/challenges'),
      $fetch<{ success: boolean; data: Contact[] }>('/api/contacts'),
      $fetch<{ images: string[] }>('/api/outline-images').catch(() => ({ images: [] })),
    ])

    if (settingsRes.success && settingsRes.data?.dailyChallengeTarget) {
      dailyTarget.value = Number(settingsRes.data.dailyChallengeTarget)
      targetInput.value = dailyTarget.value
    }
    if (contactsRes.success) {
      contacts.value = contactsRes.data
    }
    if (imagesRes && imagesRes.images) {
      availableImages.value = imagesRes.images
    }

    if (challengesRes.success) {
      const allChallenges = challengesRes.data
      const today = todayStr.value

      // Find any unfinished challenges from the past selected for a previous date
      const overdueChallenges = allChallenges.filter((c) => {
        return !c.completedAt && c.selectedForDate && c.selectedForDate < today
      })

      // Roll them over to today
      if (overdueChallenges.length > 0) {
        for (const c of overdueChallenges) {
          c.selectedForDate = today
        }
        challenges.value = allChallenges

        // Persist rollover in the database asynchronously
        Promise.all(
          overdueChallenges.map((c) =>
            $fetch(`/api/challenges/${c.id}`, {
              method: 'PUT',
              body: { selectedForDate: today },
            }).catch((err) => {
              console.error(`Erreur lors du report du défi ${c.id}:`, err)
            })
          )
        )
      } else {
        challenges.value = allChallenges
      }
    }
  } catch (err) {
    console.error('Erreur lors du chargement des données:', err)
  } finally {
    if (showLoading) {
      loading.value = false
    }
  }
}

onMounted(() => {
  fetchData(true)
})

const getLocalDateString = (d: Date | string | null = new Date()) => {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayStr = computed(() => getLocalDateString(new Date()))

const todayDateFormatted = computed(() => {
  const now = new Date()
  const formatted = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Capitalize first letter of the weekday (e.g. "samedi 15 août" -> "Samedi 15 août")
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})

// Challenge Categories:
const finishedChallenges = computed(() => {
  return challenges.value.filter((c) => !!c.completedAt)
})

const finishedTodayChallenges = computed(() => {
  return challenges.value.filter((c) => {
    if (!c.completedAt) return false
    return getLocalDateString(c.completedAt) === todayStr.value
  })
})

const todoChallenges = computed(() => {
  return challenges.value.filter((c) => !c.completedAt)
})

// Tab 3: Todo Challenges (rank desc)
const sortedTodoChallenges = computed(() => {
  return [...todoChallenges.value].sort((a, b) => {
    return (b.rank ?? 2.5) - (a.rank ?? 2.5)
  })
})

// Challenges selected for today (not completed), sorted with newest first to prevent reordering jumps
const selectedTodayChallenges = computed(() => {
  return [...todoChallenges.value.filter((c) => c.selectedForDate === todayStr.value)].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0
    const timeB = new Date(b.createdAt).getTime() || 0
    return timeB - timeA
  })
})

// Challenges available to select (not completed and not selected for today)
const availableUnselectedChallenges = computed(() => {
  return [...todoChallenges.value.filter((c) => c.selectedForDate !== todayStr.value)].sort((a, b) => {
    return (b.rank ?? 2.5) - (a.rank ?? 2.5)
  })
})

// Modal: Select existing challenge state
const isSelectExistingModalOpen = ref(false)
const selectedChallengeToAddId = ref<string>('')

const selectedChallengeToAdd = computed(() => {
  if (!selectedChallengeToAddId.value) return null
  return availableUnselectedChallenges.value.find((c) => c.id === selectedChallengeToAddId.value) || null
})

const openSelectExistingModal = () => {
  if (availableUnselectedChallenges.value.length === 0) return
  selectedChallengeToAddId.value = availableUnselectedChallenges.value[0]?.id ?? ''
  isSelectExistingModalOpen.value = true
}

const addSelectedChallengeToToday = async () => {
  if (!selectedChallengeToAddId.value) return
  const challengeId = selectedChallengeToAddId.value
  const today = todayStr.value

  // Optimistic update: close modal and mark challenge as selected for today immediately
  isSelectExistingModalOpen.value = false
  const targetChallenge = challenges.value.find((c) => c.id === challengeId)
  if (targetChallenge) {
    targetChallenge.selectedForDate = today
  }

  try {
    const res = await $fetch<{ success: boolean; data: Challenge }>(`/api/challenges/${challengeId}`, {
      method: 'PUT',
      body: {
        selectedForDate: today,
      },
    })
    if (res.success && res.data) {
      const idx = challenges.value.findIndex((c) => c.id === challengeId)
      if (idx !== -1) {
        challenges.value[idx] = { ...challenges.value[idx], ...res.data }
      }
    }
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de l’ajout du défi au jour:', err)
    await fetchData()
  }
}

const deselectChallenge = async (challenge: Challenge) => {
  // Optimistic update: immediately clear selectedForDate in memory
  const previousSelectedDate = challenge.selectedForDate
  challenge.selectedForDate = null

  try {
    const res = await $fetch<{ success: boolean; data: Challenge }>(`/api/challenges/${challenge.id}`, {
      method: 'PUT',
      body: {
        selectedForDate: null,
      },
    })
    if (res.success && res.data) {
      const idx = challenges.value.findIndex((c) => c.id === challenge.id)
      if (idx !== -1) {
        challenges.value[idx] = { ...challenges.value[idx], ...res.data }
      }
    }
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la désélection du défi:', err)
    challenge.selectedForDate = previousSelectedDate
    await fetchData()
  }
}

// Top Panel: daily goal slots
// All challenges today (finished and doing) sorted by rank descending, followed by empty slots up to dailyTarget
const dailyGoalSlots = computed(() => {
  const goalCount = Math.max(1, dailyTarget.value || 1)
  const slots: Array<{
    status: 'finished' | 'doing' | 'empty'
    challenge?: Challenge
  }> = []

  const todayList: Array<{
    status: 'finished' | 'doing'
    challenge: Challenge
  }> = []

  // Finished challenges today
  for (const c of finishedTodayChallenges.value) {
    todayList.push({
      status: 'finished',
      challenge: c,
    })
  }

  // Selected challenges for today
  for (const c of selectedTodayChallenges.value) {
    todayList.push({
      status: 'doing',
      challenge: c,
    })
  }

  // Sort by rank descending
  todayList.sort((a, b) => {
    return (b.challenge.rank ?? 2.5) - (a.challenge.rank ?? 2.5)
  })

  // Add all sorted challenges to slots
  for (const item of todayList) {
    slots.push(item)
  }

  // Remaining empty slots up to dailyTarget (if below target)
  while (slots.length < goalCount) {
    slots.push({
      status: 'empty',
    })
  }

  return slots
})

const allSlotsFilled = computed(() => {
  const goalCount = Math.max(1, dailyTarget.value || 1)
  const totalOccupied = finishedTodayChallenges.value.length + selectedTodayChallenges.value.length
  return totalOccupied >= goalCount
})

// Relative date formatter (in French)
const formatRelativeDate = (d: string | null | undefined) => {
  if (!d) return '—'
  const dateObj = new Date(d)
  if (isNaN(dateObj.getTime())) return d

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
  
  const diffTime = today.getTime() - targetDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays > 1 && diffDays < 30) return `Il y a ${diffDays} jours`

  return dateObj.toLocaleDateString('fr-FR')
}

// Filtered Lists
const filteredContacts = computed(() => {
  let list = [...contacts.value].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  if (!searchContacts.value.trim()) return list
  const q = searchContacts.value.trim().toLowerCase()
  return list.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.telephone && c.telephone.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })
})

const filteredFinishedChallenges = computed(() => {
  let list = [...finishedChallenges.value].sort((a, b) => {
    const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return timeB - timeA
  })
  if (!searchFinished.value.trim()) return list
  const q = searchFinished.value.trim().toLowerCase()
  return list.filter((c) => {
    const contactName = c.contact?.name?.toLowerCase() || ''
    const text = (c.challengeText || '').toLowerCase()
    const notes = c.afterChallengeNotes?.toLowerCase() || ''
    return text.includes(q) || contactName.includes(q) || notes.includes(q)
  })
})

const activeContactChallenges = computed(() => {
  if (!activeContactForChallenges.value) return []
  const cId = activeContactForChallenges.value.id
  const list = [...challenges.value.filter((c) => c.contactId === cId)]
  return list.sort((a, b) => {
    // Non terminés d'abord
    if (!a.completedAt && b.completedAt) return -1
    if (a.completedAt && !b.completedAt) return 1
    // Si tous deux non terminés : rang décroissant
    if (!a.completedAt && !b.completedAt) {
      return (b.rank ?? 2.5) - (a.rank ?? 2.5)
    }
    // Si tous deux terminés : date d'accomplissement décroissante
    return new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
  })
})

const selectedContactDetailChallenges = computed(() => {
  if (!selectedContactForDetail.value) return []
  const cId = selectedContactForDetail.value.id
  const list = [...challenges.value.filter((c) => c.contactId === cId)]
  return list.sort((a, b) => {
    // Non terminés d'abord
    if (!a.completedAt && b.completedAt) return -1
    if (a.completedAt && !b.completedAt) return 1
    // Si tous deux non terminés : rang décroissant
    if (!a.completedAt && !b.completedAt) {
      return (b.rank ?? 2.5) - (a.rank ?? 2.5)
    }
    // Si tous deux terminés : date d'accomplissement décroissante
    return new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
  })
})

// Save Daily Target
const saveDailyTarget = async () => {
  if (targetInput.value < 1) targetInput.value = 1
  const prevTarget = dailyTarget.value
  // Optimistic update
  dailyTarget.value = targetInput.value
  isEditingTarget.value = false

  try {
    await $fetch('/api/settings', {
      method: 'POST',
      body: {
        key: 'daily_challenge_target',
        value: String(targetInput.value),
      },
    })
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l’objectif:', err)
    dailyTarget.value = prevTarget
  }
}

// Return to challenge modal after contact edit flag
const returnToChallengeModalAfterContact = ref(false)

// Contact CRUD Handlers
const openCreateContactModal = () => {
  isEditingContact.value = false
  contactForm.value = {
    id: '',
    name: '',
    email: '',
    telephone: '',
    description: '',
    mapUrl: '',
    url: '',
  }
  isContactModalOpen.value = true
}

const openEditContactModal = (contact: Contact) => {
  isEditingContact.value = true
  contactForm.value = {
    id: contact.id,
    name: contact.name,
    email: contact.email || '',
    telephone: contact.telephone || '',
    description: contact.description || '',
    mapUrl: contact.mapUrl || '',
    url: contact.url || '',
  }
  isContactModalOpen.value = true
}

const openEditContactFromChallengeModal = () => {
  const cId = challengeForm.value.contactId
  if (!cId) return
  const contact = contacts.value.find((c) => c.id === cId)
  if (!contact) return
  returnToChallengeModalAfterContact.value = true
  isChallengeModalOpen.value = false
  openEditContactModal(contact)
}

const closeContactModal = () => {
  isContactModalOpen.value = false
  if (returnToChallengeModalAfterContact.value) {
    returnToChallengeModalAfterContact.value = false
    isChallengeModalOpen.value = true
  }
}

const submitContactForm = async () => {
  if (!contactForm.value.name.trim()) return
  contactSubmitting.value = true

  const isEditing = isEditingContact.value
  const formValues = { ...contactForm.value }
  isContactModalOpen.value = false

  const shouldReturnToChallenge = returnToChallengeModalAfterContact.value
  returnToChallengeModalAfterContact.value = false

  // Optimistic update
  if (isEditing) {
    const existingIdx = contacts.value.findIndex((c) => c.id === formValues.id)
    if (existingIdx !== -1) {
      const existing = contacts.value[existingIdx]
      if (existing) {
        contacts.value[existingIdx] = {
          ...existing,
          name: formValues.name.trim(),
          email: formValues.email.trim() || null,
          telephone: formValues.telephone.trim() || null,
          description: formValues.description.trim() || null,
          mapUrl: formValues.mapUrl.trim() || null,
          url: formValues.url.trim() || null,
        }
        if (activeContactForChallenges.value?.id === formValues.id) {
          activeContactForChallenges.value = contacts.value[existingIdx]
        }
      }
    }
  }

  if (shouldReturnToChallenge) {
    isChallengeModalOpen.value = true
  }

  try {
    const res = await $fetch<{ success: boolean; data: Contact }>('/api/contacts', {
      method: 'POST',
      body: {
        id: isEditing ? formValues.id : undefined,
        name: formValues.name.trim(),
        email: formValues.email.trim() || undefined,
        telephone: formValues.telephone.trim() || undefined,
        description: formValues.description.trim() || undefined,
        mapUrl: formValues.mapUrl.trim() || undefined,
        url: formValues.url.trim() || undefined,
      },
    })
    await fetchData()
    if (activeContactForChallenges.value && isEditing && activeContactForChallenges.value.id === formValues.id) {
      activeContactForChallenges.value = contacts.value.find((c) => c.id === formValues.id) || null
    }
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du contact:', err)
    await fetchData()
  } finally {
    contactSubmitting.value = false
  }
}

const deleteContact = async (contact: Contact) => {
  const count = challenges.value.filter((c) => c.contactId === contact.id).length
  const warning = count > 0 
    ? `⚠️ Attention : Supprimer "${contact.name}" supprimera également ses ${count} défi(s) associé(s) !\n\nEs-tu sûr(e) de vouloir continuer ?`
    : `Es-tu sûr(e) de vouloir supprimer le contact "${contact.name}" ?`

  if (!confirm(warning)) return

  // Optimistic delete
  contacts.value = contacts.value.filter((c) => c.id !== contact.id)
  challenges.value = challenges.value.filter((c) => c.contactId !== contact.id)
  if (activeContactForChallenges.value?.id === contact.id) {
    isContactChallengesModalOpen.value = false
    activeContactForChallenges.value = null
  }

  try {
    await $fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du contact:', err)
    await fetchData()
  }
}

const openContactChallengesModal = (contact: Contact) => {
  activeContactForChallenges.value = contact
  isContactChallengesModalOpen.value = true
}

// Challenge CRUD Handlers
const createChallengeAssignToToday = ref<boolean | null>(null)

const openCreateChallengeModal = (presetContactId?: string, defaultFinished = false, assignToToday?: boolean) => {
  isEditingChallenge.value = false
  editingChallengeId.value = ''
  createChallengeAssignToToday.value = assignToToday !== undefined ? assignToToday : null
  
  challengeForm.value = {
    contactMode: contacts.value.length > 0 ? 'existing' : 'new',
    contactId: presetContactId || contacts.value[0]?.id || '',
    newContactName: '',
    newContactEmail: '',
    newContactPhone: '',
    newContactDescription: '',
    newContactMapUrl: '',
    newContactUrl: '',
    challengeText: '',
    type: 'written',
    rank: 2.5,
    isFinished: defaultFinished,
    completedAt: defaultFinished ? getCurrentTimestamp() : '',
    afterChallengeNotes: '',
  }
  isChallengeModalOpen.value = true
}

const openEditChallengeModal = (challenge: Challenge) => {
  isEditingChallenge.value = true
  editingChallengeId.value = challenge.id

  challengeForm.value = {
    contactMode: 'existing',
    contactId: challenge.contactId,
    newContactName: '',
    newContactEmail: '',
    newContactPhone: '',
    newContactDescription: '',
    newContactMapUrl: '',
    newContactUrl: '',
    challengeText: challenge.challengeText,
    type: challenge.type,
    rank: challenge.rank ?? 2.5,
    isFinished: !!challenge.completedAt,
    completedAt: challenge.completedAt ? formatDateForDisplay(challenge.completedAt) : '',
    afterChallengeNotes: challenge.afterChallengeNotes || '',
  }
  isChallengeModalOpen.value = true
}

// History of challenges for the contact currently selected in the challenge creation modal
const modalContactHistory = computed(() => {
  const cId = challengeForm.value.contactId
  if (!cId || challengeForm.value.contactMode !== 'existing') return []
  return challenges.value
    .filter((c) => c.contactId === cId)
    .sort((a, b) => {
      const dateA = a.completedAt || a.createdAt || ''
      const dateB = b.completedAt || b.createdAt || ''
      return dateB.localeCompare(dateA)
    })
})

const submitChallengeForm = async () => {
  if (!challengeForm.value.challengeText.trim()) return
  challengeSubmitting.value = true

  const isEditing = isEditingChallenge.value
  const challengeId = editingChallengeId.value
  const formValues = { ...challengeForm.value }

  // Tout défi créé non terminé est toujours assigné à aujourd'hui
  const shouldSelectForToday = !formValues.isFinished

  // Optimistic update for edits
  if (isEditing) {
    const existingIdx = challenges.value.findIndex((c) => c.id === challengeId)
    const existingChallenge = challenges.value[existingIdx]
    if (existingIdx !== -1 && existingChallenge) {
      const contactObj = contacts.value.find((c) => c.id === formValues.contactId)
      challenges.value[existingIdx] = {
        ...existingChallenge,
        challengeText: formValues.challengeText.trim(),
        type: formValues.type,
        contactId: formValues.contactId,
        contact: contactObj || existingChallenge.contact,
        rank: Number(formValues.rank) || 2.5,
        afterChallengeNotes: formValues.afterChallengeNotes.trim() || null,
        completedAt: formValues.isFinished && formValues.completedAt
          ? new Date(formValues.completedAt).toISOString()
          : (formValues.isFinished ? new Date().toISOString() : null),
      }
    }
  } else {
    // Optimistic insert for new challenge
    const tempId = `temp-${Date.now()}`
    const contactObj = formValues.contactMode === 'existing'
      ? contacts.value.find((c) => c.id === formValues.contactId)
      : {
          id: `temp-c-${Date.now()}`,
          name: formValues.newContactName.trim() || 'Nouveau contact',
          email: formValues.newContactEmail.trim() || null,
          telephone: formValues.newContactPhone.trim() || null,
          description: formValues.newContactDescription.trim() || null,
          mapUrl: formValues.newContactMapUrl.trim() || null,
          url: formValues.newContactUrl.trim() || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

    const optimisticChallenge: Challenge = {
      id: tempId,
      contactId: contactObj?.id || formValues.contactId || '',
      contact: contactObj,
      challengeText: formValues.challengeText.trim(),
      type: formValues.type,
      rank: Number(formValues.rank) || 2.5,
      selectedForDate: shouldSelectForToday ? todayStr.value : null,
      afterChallengeNotes: formValues.afterChallengeNotes.trim() || null,
      completedAt: formValues.isFinished && formValues.completedAt
        ? new Date(formValues.completedAt).toISOString()
        : (formValues.isFinished ? new Date().toISOString() : null),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    challenges.value.unshift(optimisticChallenge)
  }

  isChallengeModalOpen.value = false

  try {
    if (isEditing) {
      // Update
      const payload: any = {
        challengeText: formValues.challengeText.trim(),
        type: formValues.type,
        contactId: formValues.contactId,
        rank: Number(formValues.rank) || 2.5,
        afterChallengeNotes: formValues.afterChallengeNotes.trim() || null,
        completedAt: formValues.isFinished && formValues.completedAt
          ? new Date(formValues.completedAt).toISOString()
          : (formValues.isFinished ? new Date().toISOString() : null),
      }

      await $fetch(`/api/challenges/${challengeId}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      // Create
      const payload: any = {
        challengeText: formValues.challengeText.trim(),
        type: formValues.type,
        rank: Number(formValues.rank) || 2.5,
      }

      // Add to today's list if not completed and there are open slots
      if (shouldSelectForToday) {
        payload.selectedForDate = todayStr.value
      }

      if (formValues.contactMode === 'existing') {
        payload.contactId = formValues.contactId
      } else {
        payload.newContactName = formValues.newContactName.trim()
        payload.newContactEmail = formValues.newContactEmail.trim() || undefined
        payload.newContactPhone = formValues.newContactPhone.trim() || undefined
        payload.newContactDescription = formValues.newContactDescription.trim() || undefined
        payload.newContactMapUrl = formValues.newContactMapUrl.trim() || undefined
        payload.newContactUrl = formValues.newContactUrl.trim() || undefined
      }

      const res = await $fetch<{ success: boolean; data: Challenge }>('/api/challenges', {
        method: 'POST',
        body: payload,
      })

      if (res.success && formValues.isFinished && res.data?.id) {
        await $fetch(`/api/challenges/${res.data.id}/complete`, {
          method: 'POST',
          body: {
            completedAt: formValues.completedAt
              ? new Date(formValues.completedAt).toISOString()
              : new Date().toISOString(),
            afterChallengeNotes: formValues.afterChallengeNotes.trim() || null,
          },
        })
      }
    }

    await fetchData()
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du défi:', err)
    await fetchData()
  } finally {
    challengeSubmitting.value = false
  }
}

const deleteChallenge = async (challenge: Challenge) => {
  if (!confirm(`Es-tu sûr(e) de vouloir supprimer ce défi ?`)) return

  // Optimistic delete
  challenges.value = challenges.value.filter((c) => c.id !== challenge.id)

  try {
    await $fetch(`/api/challenges/${challenge.id}`, { method: 'DELETE' })
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du défi:', err)
    await fetchData()
  }
}

// Reflection / Completion Handlers
const openReflectModal = (challenge: Challenge) => {
  selectedChallengeForReflect.value = challenge
  reflectNotes.value = challenge.afterChallengeNotes || ''
  reflectCompletedAt.value = getCurrentTimestamp()
  isReflectModalOpen.value = true
}

const submitReflection = async () => {
  if (!selectedChallengeForReflect.value) return
  reflectSubmitting.value = true

  const targetChallenge = selectedChallengeForReflect.value
  const notes = reflectNotes.value
  const completedDate = new Date(reflectCompletedAt.value).toISOString()

  // Optimistic update
  targetChallenge.completedAt = completedDate
  targetChallenge.afterChallengeNotes = notes || null
  isReflectModalOpen.value = false

  try {
    const res = await $fetch<{ success: boolean; data: Challenge }>(
      `/api/challenges/${targetChallenge.id}/complete`,
      {
        method: 'POST',
        body: {
          completedAt: completedDate,
          afterChallengeNotes: notes,
        },
      }
    )
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du bilan:', err)
    await fetchData()
  } finally {
    reflectSubmitting.value = false
  }
}

// Border & Color algorithm:
// completed = green
// doing / available = yellow / amber
// empty = red
const getSlotCardBorderClass = (status: 'finished' | 'doing' | 'empty') => {
  if (status === 'finished') {
    return 'border-emerald-500/80 dark:border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.15)] bg-emerald-50/20 dark:bg-emerald-950/10'
  }
  if (status === 'doing') {
    return 'border-amber-400/90 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-50/20 dark:bg-amber-950/10'
  }
  return 'border-gray-300 dark:border-gray-700/80 shadow-[0_0_15px_rgba(0,0,0,0.05)] bg-gray-50/50 dark:bg-gray-900/30'
}

// Format Type & Rank: e.g. "oral 3.8", "écrit" (if rank is 2.5, don't show it)
const formatTypeAndRank = (type: string, rank?: number) => {
  const typeLabel = type === 'written' ? 'écrit' : 'oral'
  const rankNum = Number(rank ?? 2.5)
  if (Math.abs(rankNum - 2.5) < 0.01) {
    return typeLabel
  }
  return `${typeLabel} ${rankNum.toFixed(1)}`
}

// Normaliser l'URL pour les liens (s'assurer qu'il commence par http:// ou https://)
const normalizeUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

// Formater pour l'affichage "nice url" (ex: https://en.destinationdijon.com/ -> destinationdijon.com)
const formatNiceUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  try {
    const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(fullUrl)
    let hostname = parsed.hostname.toLowerCase()

    // Retirer les sous-domaines courants : www., en., fr., de., es., it., etc.
    const subdomainsToRemove = ['www.', 'en.', 'fr.', 'de.', 'es.', 'it.', 'm.']
    for (const sub of subdomainsToRemove) {
      if (hostname.startsWith(sub)) {
        hostname = hostname.slice(sub.length)
      }
    }

    return hostname || parsed.hostname
  } catch {
    // Si parsing échoue, nettoyage par regex
    let clean = trimmed.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
    clean = clean.replace(/^(www\.|en\.|fr\.|de\.|es\.|it\.|m\.)/i, '')
    return clean
  }
}

// Nettoyer le texte du défi pour l'affichage en une seule ligne (retire les puces, formatages outline et tags images)
const cleanSingleLineText = (text: string | null | undefined): string => {
  if (!text) return ''
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^[-*•]\s+/, ''))
    .filter((l) => l.length > 0)
    .join(' — ')
    .replace(/##[a-zA-Z0-9_\-]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

// État et logique de copie dans le presse-papier
const copiedChallengeId = ref<string | null>(null)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

const copyChallengeText = async (challenge: Challenge) => {
  if (!challenge || !challenge.challengeText) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(challenge.challengeText)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = challenge.challengeText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    copiedChallengeId.value = challenge.id
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => {
      if (copiedChallengeId.value === challenge.id) {
        copiedChallengeId.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Erreur lors de la copie dans le presse-papier:', err)
  }
}

const copiedNotesId = ref<string | null>(null)
let copyNotesTimeout: ReturnType<typeof setTimeout> | null = null

const copyNotes = async (challenge: Challenge) => {
  if (!challenge || !challenge.afterChallengeNotes) return
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(challenge.afterChallengeNotes)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = challenge.afterChallengeNotes
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    copiedNotesId.value = challenge.id
    if (copyNotesTimeout) clearTimeout(copyNotesTimeout)
    copyNotesTimeout = setTimeout(() => {
      if (copiedNotesId.value === challenge.id) {
        copiedNotesId.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Erreur lors de la copie des notes dans le presse-papier:', err)
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8 pb-16">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Défis de communication réelle
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              Utiliser et améliorer ton français pour accomplir des tâches concrètes et élargir ton réseau social
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Panel: Tes défis pour aujourd'hui -->
    <div class="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4 text-center sm:text-left">
        <div class="flex flex-col sm:flex-row sm:items-start items-center gap-2.5">
          <!-- Calendar icon hidden on mobile, visible on sm and up -->
          <UIcon name="i-heroicons-calendar-days" class="hidden sm:block w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
          <div class="text-center sm:text-left">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white !mb-0 !leading-none text-center sm:text-left">
              Tes défis pour <span class="text-indigo-600 dark:text-indigo-400">{{ todayDateFormatted }}</span>
            </h2>
            <p v-if="!loading" class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center sm:text-left">
              Complète tes {{ dailyTarget }} défis pour atteindre ton objectif du jour
            </p>
            <p v-else class="text-xs text-transparent select-none mt-1 text-center sm:text-left aria-hidden">
              Chargement...
            </p>
          </div>
        </div>

        <!-- Target Progress / Setting (Centered on mobile) -->
        <div class="flex items-center justify-center gap-3 self-center sm:self-start">
          <div v-if="!loading && !isEditingTarget" class="flex items-center gap-2">
            <div class="flex flex-col items-center">
              <span class="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none tracking-tight">
                {{ finishedTodayChallenges.length }} sur {{ dailyTarget }}
              </span>
              <span class="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 mt-1">
                terminés aujourd'hui
              </span>
            </div>
            <button
              @click="isEditingTarget = true"
              class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer self-center"
              title="Modifier l'objectif quotidien"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
            </button>
          </div>
          <div v-else-if="!loading && isEditingTarget" class="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <input
              v-model.number="targetInput"
              type="number"
              min="1"
              max="100"
              class="w-16 px-2 py-1 text-sm font-bold border rounded-lg border-indigo-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center"
            />
            <button
              @click="saveDailyTarget"
              class="px-2.5 py-1 font-semibold bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-500 cursor-pointer"
            >
              OK
            </button>
            <button
              @click="isEditingTarget = false"
              class="px-2.5 py-1 font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State: Single centered spinner turning slowly -->
      <div
        v-if="loading"
        class="relative rounded-2xl p-8 bg-gray-50/50 dark:bg-gray-900/40 border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center min-h-[190px] mt-5"
      >
        <div class="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin [animation-duration:2.5s]"></div>
        <span class="text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium">Chargement de tes défis...</span>
      </div>

      <!-- Loaded State: 2 Flex Columns Maximum Grid for Challenges Cards -->
      <div v-else class="space-y-4 mt-5">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <template v-for="(slot, index) in dailyGoalSlots" :key="slot.challenge?.id ? `challenge-${slot.challenge.id}` : `slot-${index}`">
            <!-- 1. Finished Challenge Card (Green) -->
            <div
              v-if="slot.status === 'finished' && slot.challenge"
              class="relative rounded-2xl p-5 border-2 transition-all flex flex-col justify-between min-h-[170px]"
              :class="getSlotCardBorderClass('finished')"
            >
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 leading-none">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-500 shrink-0" />
                    Défi #{{ index + 1 }} accompli
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center leading-none">
                      {{ Number(slot.challenge.rank ?? 2.5).toFixed(1) }} {{ slot.challenge.type === 'written' ? 'écrit' : 'oral' }}
                    </span>
                    <button
                      @click="openEditChallengeModal(slot.challenge)"
                      class="p-1 rounded-md text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                      title="Modifier le défi"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Contact row: Centered, larger text, top & bottom borders with light themed background -->
                <div class="py-2 px-3 border-y border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-sm flex items-center justify-center gap-2 text-center text-xs">
                  <button
                    v-if="slot.challenge.contact"
                    @click="openContactDetailModal(slot.challenge.contact)"
                    class="font-bold text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-emerald-100 transition-colors cursor-pointer"
                    title="Afficher les détails du contact"
                  >
                    {{ slot.challenge.contact.name }}
                  </button>
                  <span v-else class="font-bold text-base text-emerald-800 dark:text-emerald-200">Contact</span>
                  <a
                    v-if="slot.challenge.contact?.url"
                    :href="normalizeUrl(slot.challenge.contact.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center"
                    :title="slot.challenge.contact.url"
                  >
                    <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                  </a>
                  <a
                    v-if="slot.challenge.contact?.mapUrl"
                    :href="slot.challenge.contact.mapUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center"
                    title="Voir sur Google Maps"
                  >
                    <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
                  </a>
                </div>

                <!-- Full Challenge Content without truncation -->
                <div>
                  <OutlineContent :text="slot.challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
                </div>

                <!-- After Challenge Notes -->
                <div
                  v-if="slot.challenge.afterChallengeNotes"
                  class="relative mt-2 p-2.5 pb-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200"
                >
                  <div class="italic">
                    <OutlineContent :text="slot.challenge.afterChallengeNotes" :available-images="availableImages" />
                  </div>
                  <button
                    @click.stop="copyNotes(slot.challenge)"
                    class="absolute bottom-1.5 right-1.5 p-1 rounded-md text-emerald-700/80 hover:text-emerald-800 dark:text-emerald-300/80 dark:hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                    :title="copiedNotesId === slot.challenge.id ? 'Copié dans le presse-papier !' : 'Copier les notes'"
                  >
                    <UIcon v-if="copiedNotesId === slot.challenge.id" name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Bottom Area of Green Card -->
              <div class="mt-4 flex items-center justify-between gap-2 flex-wrap text-xs">
                <button
                  v-if="slot.challenge.contact"
                  @click="openCreateChallengeModal(slot.challenge.contactId)"
                  class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <UIcon name="i-heroicons-plus-circle" class="w-3.5 h-3.5" />
                  <span>Créer un autre défi pour ce contact</span>
                </button>
                <div v-else></div>

                <!-- Terminé badge -->
                <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 whitespace-nowrap">
                  <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Terminé
                </span>
              </div>
            </div>

            <!-- 2. Doing / Selected Challenge Card (Yellow / Amber) -->
            <div
              v-else-if="slot.status === 'doing' && slot.challenge"
              class="relative rounded-2xl p-5 border-2 transition-all flex flex-col justify-between min-h-[170px]"
              :class="getSlotCardBorderClass('doing')"
            >
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5 leading-none">
                    <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-amber-500 shrink-0" />
                    Défi #{{ index + 1 }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center leading-none">
                      {{ Number(slot.challenge.rank ?? 2.5).toFixed(1) }} {{ slot.challenge.type === 'written' ? 'écrit' : 'oral' }}
                    </span>
                    <button
                      @click="openEditChallengeModal(slot.challenge)"
                      class="p-1 rounded-md text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                      title="Modifier le défi"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                    </button>
                    <button
                      @click="deselectChallenge(slot.challenge)"
                      class="p-1 rounded-md text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                      title="Désélectionner ce défi"
                    >
                      <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Contact row: Centered, larger text, top & bottom borders with light themed background -->
                <div class="py-2 px-3 border-y border-amber-200/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 rounded-sm flex items-center justify-center gap-2 text-center text-xs">
                  <button
                    v-if="slot.challenge.contact"
                    @click="openContactDetailModal(slot.challenge.contact)"
                    class="font-bold text-base text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
                    title="Afficher les détails du contact"
                  >
                    {{ slot.challenge.contact.name }}
                  </button>
                  <span v-else class="font-bold text-base text-amber-800 dark:text-amber-200">Contact</span>
                  <a
                    v-if="slot.challenge.contact?.url"
                    :href="normalizeUrl(slot.challenge.contact.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center"
                    :title="slot.challenge.contact.url"
                  >
                    <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
                  </a>
                  <a
                    v-if="slot.challenge.contact?.mapUrl"
                    :href="slot.challenge.contact.mapUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center"
                    title="Voir sur Google Maps"
                  >
                    <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
                  </a>
                </div>

                <!-- Full Challenge Content without truncation + Copy to clipboard -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <OutlineContent :text="slot.challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
                  </div>
                  <button
                    @click.stop="copyChallengeText(slot.challenge)"
                    class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center mt-0.5"
                    :title="copiedChallengeId === slot.challenge.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
                  >
                    <UIcon v-if="copiedChallengeId === slot.challenge.id" name="i-heroicons-check" class="w-4 h-4 text-amber-500 dark:text-yellow-400" />
                    <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Bottom Area of Yellow Card -->
              <!-- Action buttons + En cours -->
              <div class="mt-4 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap text-xs">
                <div class="flex items-center gap-2">
                  <button
                    @click="deselectChallenge(slot.challenge)"
                    class="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    title="Désélectionner ce défi de la journée"
                  >
                    <UIcon name="i-heroicons-arrow-uturn-left" class="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                    <span>Désélectionner</span>
                  </button>
                  <button
                    @click="openReflectModal(slot.challenge)"
                    class="px-3.5 py-1.5 rounded-lg border border-emerald-500 hover:border-emerald-600 text-emerald-700 hover:text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 dark:border-emerald-500/80 dark:text-emerald-300 dark:hover:text-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Valider et faire le bilan"
                  >
                    <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-2" />
                    <span>Terminer</span>
                  </button>
                </div>
                <span class="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 whitespace-nowrap">
                  <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                  En&nbsp;cours
                </span>
              </div>
            </div>

            <!-- 3. Empty Slot Card (Gray) -->
            <div
              v-else
              class="relative rounded-2xl p-5 border-2 transition-all flex flex-col items-center justify-center text-center min-h-[170px] gap-2.5"
              :class="getSlotCardBorderClass('empty')"
            >
              <!-- Button: Select existing challenge (if available) -->
              <button
                v-if="availableUnselectedChallenges.length > 0"
                @click="openSelectExistingModal"
                class="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:scale-102"
              >
                <UIcon name="i-heroicons-list-bullet" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Choisir un défi existant ({{ availableUnselectedChallenges.length }})</span>
              </button>

              <!-- Button: Create a challenge -->
              <button
                @click="openCreateChallengeModal(undefined, false, true)"
                class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/70 dark:text-gray-200 dark:hover:text-white border border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:scale-102"
              >
                <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Créer un défi</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Extra Challenge Buttons: Displayed side-to-side full width when all card slots are filled -->
        <div
          v-if="allSlotsFilled"
          class="grid gap-3 pt-1"
          :class="availableUnselectedChallenges.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'"
        >
          <!-- Button 1: Choisir un défi existant -->
          <button
            v-if="availableUnselectedChallenges.length > 0"
            @click="openSelectExistingModal"
            class="w-full py-3 px-4 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-[1.01]"
          >
            <UIcon name="i-heroicons-list-bullet" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Choisir un défi existant ({{ availableUnselectedChallenges.length }})</span>
          </button>

          <!-- Button 2: Créer un défi -->
          <button
            @click="openCreateChallengeModal(undefined, false, true)"
            class="w-full py-3 px-4 rounded-xl bg-gray-100/90 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/70 dark:text-gray-200 dark:hover:text-white border border-gray-300 dark:border-gray-700 dark:hover:border-gray-600 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-[1.01]"
          >
            <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span>Créer un défi</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs (4 tabs, icon-friendly on mobile) -->
    <div class="border-b border-gray-200 dark:border-gray-800">
      <div class="grid grid-cols-4 sm:flex sm:space-x-6">
        <!-- Tab 1: Contacts -->
        <button
          @click="activeTab = 'contacts'"
          class="py-3 px-1 sm:py-3.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2"
          :class="activeTab === 'contacts'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          :title="`${contacts.length} Contacts`"
        >
          <UIcon name="i-heroicons-user-group" class="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span class="hidden sm:inline">{{ contacts.length }} Contacts</span>
          <span class="sm:hidden text-[11px] font-bold">({{ contacts.length }})</span>
        </button>

        <!-- Tab 2: Challenges finished -->
        <button
          @click="activeTab = 'finished'"
          class="py-3 px-1 sm:py-3.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2"
          :class="activeTab === 'finished'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          :title="`${finishedChallenges.length} Défis terminés`"
        >
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span class="hidden sm:inline">{{ finishedChallenges.length }} Défis terminés</span>
          <span class="sm:hidden text-[11px] font-bold">({{ finishedChallenges.length }})</span>
        </button>

        <!-- Tab 3: Challenges todo -->
        <button
          @click="activeTab = 'todo'"
          class="py-3 px-1 sm:py-3.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2"
          :class="activeTab === 'todo'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          :title="`${todoChallenges.length} Défis à faire`"
        >
          <UIcon name="i-heroicons-queue-list" class="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span class="hidden sm:inline">{{ todoChallenges.length }} Défis à faire</span>
          <span class="sm:hidden text-[11px] font-bold">({{ todoChallenges.length }})</span>
        </button>

        <!-- Tab 4: History -->
        <button
          @click="activeTab = 'history'"
          class="py-3 px-1 sm:py-3.5 sm:px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2"
          :class="activeTab === 'history'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          title="Historique des défis accomplis par jour"
        >
          <UIcon name="i-heroicons-clock" class="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
          <span class="hidden sm:inline">Historique</span>
          <span class="sm:hidden text-[11px] font-bold">Hist.</span>
        </button>
      </div>
    </div>

    <div class="space-y-4">
      <!-- ============================================================ -->
      <!-- TAB 1 : CONTACTS                                             -->
      <!-- ============================================================ -->
      <div v-if="activeTab === 'contacts'" class="space-y-4">
        <!-- Controls: Search & Create -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchContacts"
              type="text"
              placeholder="Rechercher un contact (nom, email, description)..."
              class="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            @click="openCreateContactModal()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
            <span>Nouveau contact</span>
          </button>
        </div>

        <!-- Mobile View: Compact clean cards -->
        <div class="grid grid-cols-1 gap-3 md:hidden">
          <div v-if="filteredContacts.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80">
            Aucun contact trouvé.
          </div>
          <div
            v-for="contact in filteredContacts"
            :key="'mobile-c-' + contact.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                  {{ contact.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <button
                    @click="openContactDetailModal(contact)"
                    class="font-bold text-gray-900 dark:text-white text-left hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {{ contact.name }}
                  </button>
                </div>
              </div>
              <button
                @click="openContactChallengesModal(contact)"
                class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
                <span>{{ challenges.filter(c => c.contactId === contact.id).length }} défis</span>
              </button>
            </div>

            <div v-if="contact.email || contact.telephone || contact.url" class="text-xs text-gray-600 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl">
              <div v-if="contact.email" class="flex items-center gap-1.5 truncate">
                <UIcon name="i-heroicons-envelope" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span class="truncate">{{ contact.email }}</span>
              </div>
              <div v-if="contact.telephone" class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{{ contact.telephone }}</span>
              </div>
              <div v-if="contact.url" class="flex items-center gap-1.5 truncate">
                <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <a
                  :href="normalizeUrl(contact.url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                >
                  {{ formatNiceUrl(contact.url) }}
                </a>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
              <div class="flex items-center gap-2">
                <button
                  @click="openContactDetailModal(contact)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Afficher les détails"
                >
                  <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                </button>
                <button
                  @click="openEditContactModal(contact)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Modifier le contact"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
                <button
                  @click="deleteContact(contact)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Supprimer le contact"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop View: Contacts Table -->
        <div class="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Contact</th>
                  <th class="px-5 py-3.5">Défis</th>
                  <th class="px-5 py-3.5">Coordonnées</th>
                  <th class="px-5 py-3.5">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <tr v-if="filteredContacts.length === 0">
                  <td colspan="4" class="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun contact trouvé.
                  </td>
                </tr>
                <tr
                  v-for="contact in filteredContacts"
                  :key="contact.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- Contact Name + Action icons under + Large initial letter -->
                  <td class="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      <!-- Expanded letter-icon matching 2 lines -->
                      <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-base shrink-0 shadow-xs">
                        {{ contact.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex flex-col justify-center space-y-0.5 py-0.5">
                        <div class="flex items-center gap-1.5 leading-tight">
                          <button
                            @click="openContactDetailModal(contact)"
                            class="font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left leading-tight"
                            title="Afficher les détails"
                          >
                            {{ contact.name }}
                          </button>
                          <a
                            v-if="contact.url"
                            :href="normalizeUrl(contact.url)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-400 hover:text-indigo-600 inline-flex items-center"
                            :title="contact.url"
                          >
                            <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
                          </a>
                          <a
                            v-if="contact.mapUrl"
                            :href="contact.mapUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-400 hover:text-indigo-600 inline-flex items-center"
                            title="Google Maps"
                          >
                            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <!-- 3 action icons right under the contact line -->
                        <div class="flex items-center gap-0.5 text-gray-400 leading-none">
                          <button
                            @click="openContactDetailModal(contact)"
                            class="p-0.5 rounded hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Afficher les détails"
                          >
                            <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
                          </button>
                          <button
                            @click="openEditContactModal(contact)"
                            class="p-0.5 rounded hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Modifier le contact"
                          >
                            <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                          </button>
                          <button
                            @click="deleteContact(contact)"
                            class="p-0.5 rounded hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Supprimer le contact"
                          >
                            <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Défis column directly to the right of Contact -->
                  <td class="px-5 py-4 whitespace-nowrap">
                    <button
                      @click="openContactChallengesModal(contact)"
                      class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Voir la liste des défis de ce contact"
                    >
                      <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
                      <span>Défis ({{ challenges.filter(c => c.contactId === contact.id).length }})</span>
                    </button>
                  </td>

                  <!-- Contact Info -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                    <div class="space-y-0.5">
                      <div v-if="contact.email" class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-envelope" class="w-3.5 h-3.5 text-gray-400" />
                        <span>{{ contact.email }}</span>
                      </div>
                      <div v-if="contact.telephone" class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{{ contact.telephone }}</span>
                      </div>
                      <div v-if="contact.url" class="flex items-center gap-1.5 truncate">
                        <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <a
                          :href="normalizeUrl(contact.url)"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        >
                          {{ formatNiceUrl(contact.url) }}
                        </a>
                      </div>
                      <div v-if="!contact.email && !contact.telephone && !contact.url" class="text-gray-400 italic">
                        Non renseigné
                      </div>
                    </div>
                  </td>

                  <!-- Description -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                    <OutlineContent v-if="contact.description" :text="contact.description" :available-images="availableImages" :max-lines="2" />
                    <span v-else class="text-gray-400 italic">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- TAB 2 : CHALLENGES FINISHED                                  -->
      <!-- ============================================================ -->
      <div v-if="activeTab === 'finished'" class="space-y-4">
        <!-- Controls: Search & Create -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchFinished"
              type="text"
              placeholder="Rechercher parmi les défis terminés (texte, contact, bilan)..."
              class="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            @click="openCreateChallengeModal(undefined, true)"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
            <span>Nouveau défi</span>
          </button>
        </div>

        <!-- Mobile View: Clean cards -->
        <div class="grid grid-cols-1 gap-3 md:hidden">
          <div v-if="filteredFinishedChallenges.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80">
            Aucun défi terminé trouvé.
          </div>
          <div
            v-for="challenge in filteredFinishedChallenges"
            :key="'mobile-f-' + challenge.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 shadow-xs space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
                <span>Accompli</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {{ Number(challenge.rank ?? 2.5).toFixed(1) }} {{ challenge.type === 'written' ? 'écrit' : 'oral' }}
                </span>
                <button
                  @click="openChallengeDetailModal(challenge)"
                  class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
                  <span>Afficher</span>
                </button>
              </div>
            </div>

            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <OutlineContent :text="challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
              </div>
              <button
                @click.stop="copyChallengeText(challenge)"
                class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center mt-0.5"
                :title="copiedChallengeId === challenge.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
              >
                <UIcon v-if="copiedChallengeId === challenge.id" name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
              </button>
            </div>

            <div class="py-2 px-3 border-y border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-sm flex items-center justify-center gap-2 text-center text-xs">
              <button
                v-if="challenge.contact"
                @click="openContactDetailModal(challenge.contact)"
                class="font-bold text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-emerald-100 transition-colors cursor-pointer"
              >
                {{ challenge.contact.name }}
              </button>
              <span v-else class="font-bold text-base text-gray-400">Contact inconnu</span>
              <a
                v-if="challenge.contact?.url"
                :href="normalizeUrl(challenge.contact.url)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center"
                :title="challenge.contact.url"
              >
                <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
              </a>
              <a
                v-if="challenge.contact?.mapUrl"
                :href="challenge.contact.mapUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center"
                title="Google Maps"
              >
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              </a>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400">
              <span :title="formatDateForDisplay(challenge.completedAt)" class="font-medium">
                {{ formatRelativeDate(challenge.completedAt) }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  @click="openEditChallengeModal(challenge)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Modifier le défi"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
                <button
                  @click="deleteChallenge(challenge)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Supprimer le défi"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop View: Finished Challenges Table (Date d'accomplissement first) -->
        <div class="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Date d'accomplissement</th>
                  <th class="px-5 py-3.5">Défi & Contact</th>
                  <th class="px-5 py-3.5">Type & Rang</th>
                  <th class="px-5 py-3.5">Bilan / Réflexion</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <tr v-if="filteredFinishedChallenges.length === 0">
                  <td colspan="5" class="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun défi terminé trouvé.
                  </td>
                </tr>
                <tr
                  v-for="challenge in filteredFinishedChallenges"
                  :key="challenge.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- 1. Completed Date (relative with exact date tooltip) -->
                  <td class="px-5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    <span :title="formatDateForDisplay(challenge.completedAt)" class="cursor-help underline decoration-dotted decoration-gray-300 dark:decoration-gray-600">
                      {{ formatRelativeDate(challenge.completedAt) }}
                    </span>
                  </td>

                  <!-- 2. Text & Contact (Contact link opens detail modal without underline) -->
                  <td class="px-5 py-4 max-w-md">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <OutlineContent :text="challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
                      </div>
                      <button
                        @click.stop="copyChallengeText(challenge)"
                        class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                        :title="copiedChallengeId === challenge.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
                      >
                        <UIcon v-if="copiedChallengeId === challenge.id" name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <UIcon v-else name="i-heroicons-clipboard-document" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div class="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2 flex items-center gap-1.5">
                      <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
                      <button
                        v-if="challenge.contact"
                        @click="openContactDetailModal(challenge.contact)"
                        class="hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer text-left"
                        title="Afficher la fiche du contact"
                      >
                        {{ challenge.contact.name }}
                      </button>
                      <span v-else>Contact inconnu</span>
                      <a
                        v-if="challenge.contact?.url"
                        :href="normalizeUrl(challenge.contact.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-400 hover:text-indigo-600 ml-1 inline-flex items-center"
                        :title="challenge.contact.url"
                      >
                        <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
                      </a>
                      <a
                        v-if="challenge.contact?.mapUrl"
                        :href="challenge.contact.mapUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-400 hover:text-indigo-600 ml-1 inline-flex items-center"
                        title="Google Maps"
                      >
                        <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>

                  <!-- 3. Type & Rang -->
                  <td class="px-5 py-4 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300 font-normal">
                    {{ formatTypeAndRank(challenge.type, challenge.rank) }}
                  </td>

                  <!-- 4. Notes -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs">
                    <div v-if="challenge.afterChallengeNotes" class="flex items-start justify-between gap-2 group/notes">
                      <div class="flex-1">
                        <OutlineContent :text="challenge.afterChallengeNotes" :available-images="availableImages" :max-lines="3" />
                      </div>
                      <button
                        @click.stop="copyNotes(challenge)"
                        class="p-1 rounded-md text-emerald-600/70 hover:text-emerald-700 dark:text-emerald-400/70 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center opacity-70 group-hover/notes:opacity-100"
                        :title="copiedNotesId === challenge.id ? 'Copié dans le presse-papier !' : 'Copier le bilan'"
                      >
                        <UIcon v-if="copiedNotesId === challenge.id" name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <UIcon v-else name="i-heroicons-clipboard-document" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span v-else class="text-gray-400 italic">Aucun bilan</span>
                  </td>

                  <!-- 5. Actions -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        @click="openChallengeDetailModal(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Afficher les détails"
                      >
                        <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                      </button>
                      <button
                        @click="openEditChallengeModal(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Modifier le défi"
                      >
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                      </button>
                      <button
                        @click="deleteChallenge(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Supprimer le défi"
                      >
                        <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- TAB 3 : CHALLENGES TODO (no search, ordered by rank desc)    -->
      <!-- ============================================================ -->
      <div v-if="activeTab === 'todo'" class="space-y-4">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Défis en attente d'accomplissement, ordonnés par rang de priorité décroissant.
          </p>
          <button
            @click="openCreateChallengeModal(undefined, false)"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
            <span>Nouveau défi</span>
          </button>
        </div>

        <!-- Mobile View: Clean cards -->
        <div class="grid grid-cols-1 gap-3 md:hidden">
          <div v-if="sortedTodoChallenges.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80">
            Aucun défi à faire dans la réserve. Crée un nouveau défi pour commencer !
          </div>
          <div
            v-for="challenge in sortedTodoChallenges"
            :key="'mobile-t-' + challenge.id"
            class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-300 dark:border-amber-800/60 shadow-xs space-y-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <UIcon name="i-heroicons-sparkles" class="w-4 h-4" />
                <span>{{ Number(challenge.rank ?? 2.5).toFixed(1) }} {{ challenge.type === 'written' ? 'écrit' : 'oral' }}</span>
              </span>
              <button
                @click="openChallengeDetailModal(challenge)"
                class="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
                <span>Afficher</span>
              </button>
            </div>

            <!-- Contact row: Centered, larger text, top & bottom borders with light themed background -->
            <div class="py-2 px-3 border-y border-amber-200/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/40 rounded-sm flex items-center justify-center gap-2 text-center text-xs">
              <button
                v-if="challenge.contact"
                @click="openContactDetailModal(challenge.contact)"
                class="font-bold text-base text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
              >
                {{ challenge.contact.name }}
              </button>
              <span v-else class="font-bold text-base text-gray-400">Contact inconnu</span>
              <a
                v-if="challenge.contact?.url"
                :href="normalizeUrl(challenge.contact.url)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center"
                :title="challenge.contact.url"
              >
                <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
              </a>
              <a
                v-if="challenge.contact?.mapUrl"
                :href="challenge.contact.mapUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-amber-600 hover:text-amber-700 dark:text-amber-400 inline-flex items-center"
                title="Google Maps"
              >
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              </a>
            </div>

            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <OutlineContent :text="challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
              </div>
              <button
                @click.stop="copyChallengeText(challenge)"
                class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center mt-0.5"
                :title="copiedChallengeId === challenge.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
              >
                <UIcon v-if="copiedChallengeId === challenge.id" name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
              </button>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
              <button
                @click="openReflectModal(challenge)"
                class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Marquer comme accompli et rédiger un bilan"
              >
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-white stroke-2" />
                <span>Terminer</span>
              </button>
              <div class="flex items-center gap-1">
                <button
                  @click="openEditChallengeModal(challenge)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Modifier le défi"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
                <button
                  @click="deleteChallenge(challenge)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title="Supprimer le défi"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop View: Todo Table (No Type & Rang column, Rang with type under) -->
        <div class="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Rang</th>
                  <th class="px-5 py-3.5">Défi</th>
                  <th class="px-5 py-3.5">Contact</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <tr v-if="sortedTodoChallenges.length === 0">
                  <td colspan="4" class="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun défi à faire dans la réserve. Crée un nouveau défi pour commencer !
                  </td>
                </tr>
                <tr
                  v-for="challenge in sortedTodoChallenges"
                  :key="challenge.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- Rang column with 'écrit' or 'oral' under the rank in same color -->
                  <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex flex-col">
                      <span class="text-xs font-medium font-mono text-amber-600 dark:text-amber-400">
                        {{ Number(challenge.rank ?? 2.5).toFixed(1) }}
                      </span>
                      <span class="text-[11px] font-normal text-amber-600/80 dark:text-amber-400/80">
                        {{ challenge.type === 'written' ? 'écrit' : 'oral' }}
                      </span>
                    </div>
                  </td>

                  <!-- Text (Outline content rendered without truncation) + Copy to clipboard -->
                  <td class="px-5 py-4 max-w-md">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <OutlineContent :text="challenge.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
                      </div>
                      <button
                        @click.stop="copyChallengeText(challenge)"
                        class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                        :title="copiedChallengeId === challenge.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
                      >
                        <UIcon v-if="copiedChallengeId === challenge.id" name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <UIcon v-else name="i-heroicons-clipboard-document" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  <!-- Contact -->
                  <td class="px-5 py-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                      <button
                        v-if="challenge.contact"
                        @click="openContactDetailModal(challenge.contact)"
                        class="hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer text-left"
                        title="Afficher la fiche du contact"
                      >
                        {{ challenge.contact.name }}
                      </button>
                      <span v-else>—</span>
                      <a
                        v-if="challenge.contact?.url"
                        :href="normalizeUrl(challenge.contact.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-400 hover:text-indigo-600 inline-flex items-center"
                        :title="challenge.contact.url"
                      >
                        <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
                      </a>
                      <a
                        v-if="challenge.contact?.mapUrl"
                        :href="challenge.contact.mapUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-gray-400 hover:text-indigo-600"
                        title="Google Maps"
                      >
                        <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>

                  <!-- Actions with large check icon on Terminer -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openChallengeDetailModal(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Afficher les détails"
                      >
                        <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                      </button>
                      <button
                        @click="openReflectModal(challenge)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Marquer comme accompli et rédiger un bilan"
                      >
                        <UIcon name="i-heroicons-check" class="w-4 h-4 text-white stroke-2" />
                        <span>Terminer</span>
                      </button>
                      <button
                        @click="openEditChallengeModal(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Modifier le défi"
                      >
                        <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                      </button>
                      <button
                        @click="deleteChallenge(challenge)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="Supprimer le défi"
                      >
                        <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- TAB 4 : HISTORY (Challenges accomplished per day descending) -->
      <!-- ============================================================ -->
      <div v-if="activeTab === 'history'" class="space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Historique du nombre de défis accomplis par jour, classé du plus récent au plus ancien.
          </p>
        </div>

        <!-- History Card List -->
        <div v-if="historyByDay.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80">
          <UIcon name="i-heroicons-calendar" class="w-10 h-10 mx-auto text-gray-400 mb-2 opacity-60" />
          <p class="font-medium">Aucun défi accompli pour l'instant.</p>
          <p class="text-xs text-gray-400 mt-1">Les jours d'activité apparaîtront ici dès que tu auras validé des défis.</p>
        </div>

        <div v-else class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Jour</th>
                  <th class="px-5 py-3.5">Défis accomplis</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <template v-for="item in historyByDay" :key="item.dateKey">
                  <!-- Main Day Row (Clickable) -->
                  <tr
                    @click="toggleHistoryDate(item.dateKey)"
                    class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors cursor-pointer select-none"
                    :class="{ 'bg-indigo-50/40 dark:bg-indigo-950/20': expandedHistoryDate === item.dateKey }"
                  >
                    <!-- Day column -->
                    <td class="px-5 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <UIcon
                          :name="expandedHistoryDate === item.dateKey ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                          class="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform"
                        />
                        <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-indigo-500" />
                        <span class="capitalize">{{ item.formattedDate }}</span>
                        <span
                          v-if="item.isToday"
                          class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
                        >
                          Aujourd'hui
                        </span>
                      </div>
                    </td>

                    <!-- Count column -->
                    <td class="px-5 py-4 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      <div class="flex items-center justify-between gap-2">
                        <span
                          class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold"
                          :class="item.targetReached
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'"
                        >
                          <UIcon v-if="item.targetReached" name="i-heroicons-check" class="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                          {{ item.count }} {{ item.count > 1 ? 'défis accomplis' : 'défi accompli' }}
                        </span>
                        <span class="text-xs text-gray-400 font-normal">
                          {{ expandedHistoryDate === item.dateKey ? 'Masquer les défis' : 'Voir les défis' }}
                        </span>
                      </div>
                    </td>
                  </tr>

                  <!-- Expanded Accordion Row: Single Line per Challenge with Visual Hierarchy (Indigo Left Border) -->
                  <tr v-if="expandedHistoryDate === item.dateKey" class="bg-indigo-50/20 dark:bg-indigo-950/20">
                    <td colspan="2" class="p-0">
                      <div class="py-3 px-5 sm:px-6 border-l-4 border-indigo-500/80 dark:border-indigo-400/80 space-y-2 bg-indigo-50/15 dark:bg-indigo-950/10">
                        <div
                          v-for="challenge in item.challenges"
                          :key="'history-c-' + challenge.id"
                          @click="openChallengeDetailModal(challenge)"
                          class="group flex items-center gap-2.5 py-2 px-3.5 rounded-xl bg-white dark:bg-gray-800/90 border border-indigo-100/80 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-600/80 text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer overflow-hidden select-none"
                          title="Cliquer pour afficher les détails du défi"
                        >
                          <!-- Contact Section (Clickable name + Website & Map icons) -->
                          <div class="flex items-center gap-1.5 shrink-0">
                            <UIcon name="i-heroicons-user" class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <button
                              v-if="challenge.contact"
                              @click.stop="openContactDetailModal(challenge.contact)"
                              class="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors cursor-pointer hover:underline"
                              title="Afficher la fiche du contact"
                            >
                              {{ challenge.contact.name }}
                            </button>
                            <span v-else class="font-semibold text-gray-400 italic">Contact inconnu</span>

                            <!-- External Website Icon -->
                            <a
                              v-if="challenge.contact?.url"
                              :href="normalizeUrl(challenge.contact.url)"
                              target="_blank"
                              rel="noopener noreferrer"
                              @click.stop
                              class="text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 inline-flex items-center p-0.5"
                              :title="challenge.contact.url"
                            >
                              <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
                            </a>

                            <!-- Map Icon -->
                            <a
                              v-if="challenge.contact?.mapUrl"
                              :href="challenge.contact.mapUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              @click.stop
                              class="text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 inline-flex items-center p-0.5"
                              title="Google Maps"
                            >
                              <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <!-- Separator -->
                          <span class="text-gray-300 dark:text-gray-600 select-none shrink-0">—</span>

                          <!-- Action du défi (Single Line with Ellipsis and responsive max width) -->
                          <span class="flex-1 min-w-0 max-w-[80%] truncate text-gray-700 dark:text-gray-200 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {{ cleanSingleLineText(challenge.challengeText) }}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL : CONTACT (Ajout / Modification)                      -->
    <!-- ============================================================ -->
    <UModal v-model:open="isContactModalOpen">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ isEditingContact ? 'Modifier le contact' : 'Créer un nouveau contact' }}
            </h3>
            <button
              @click="closeContactModal"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="submitContactForm" class="space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Nom du contact *
              </label>
              <input
                v-model="contactForm.name"
                type="text"
                required
                placeholder="Ex: Musée des Beaux-Arts, Sophie Martin..."
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  E-mail
                </label>
                <input
                  v-model="contactForm.email"
                  type="text"
                  placeholder="contact@domaine.fr"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Téléphone
                </label>
                <input
                  v-model="contactForm.telephone"
                  type="tel"
                  placeholder="03 80 00 00 00"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Site Web
                </label>
                <input
                  v-model="contactForm.url"
                  type="text"
                  placeholder="https://exemple.fr ou exemple.fr"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Lien Google Maps
                </label>
                <input
                  v-model="contactForm.mapUrl"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Description / Rôle / Notes
              </label>
              <textarea
                v-model="contactForm.description"
                rows="3"
                placeholder="Informations utiles sur ce contact..."
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                @click="closeContactModal"
                class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="contactSubmitting"
                class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <UIcon v-if="contactSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ isEditingContact ? 'Enregistrer' : 'Créer le contact' }}</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- ============================================================ -->
    <!-- MODAL : DÉFIS CONCIS D'UN CONTACT (whenFinished asc)         -->
    <!-- ============================================================ -->
    <UModal v-model:open="isContactChallengesModalOpen">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Fiche Contact
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">
                  {{ activeContactForChallenges?.name }}
                </h3>
                <a
                  v-if="activeContactForChallenges?.mapUrl"
                  :href="activeContactForChallenges.mapUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center"
                  title="Ouvrir dans Google Maps"
                >
                  <UIcon name="i-heroicons-map-pin" class="w-5 h-5" />
                </a>
              </div>
              <div v-if="activeContactForChallenges?.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <OutlineContent :text="activeContactForChallenges.description" :available-images="availableImages" />
              </div>
            </div>
            <button
              @click="isContactChallengesModalOpen = false"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Concise list of challenges -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Défis associés :
              </h4>
              <button
                @click="openCreateChallengeModal(activeContactForChallenges?.id)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                <span>Nouveau défi</span>
              </button>
            </div>

            <div v-if="activeContactChallenges.length === 0" class="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
              Aucun défi associé à ce contact pour l'instant.
            </div>

            <div v-else class="space-y-3 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="ch in activeContactChallenges"
                :key="ch.id"
                class="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/60 text-xs space-y-2"
              >
                <!-- Top header line with light background separating from text below -->
                <div class="bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-mono font-semibold text-amber-500 dark:text-amber-300">
                      {{ formatTypeAndRank(ch.type, ch.rank) }}
                    </span>
                    <span v-if="ch.completedAt" class="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Terminé le {{ formatDateForDisplay(ch.completedAt) }}
                    </span>
                    <span v-else class="text-amber-600 dark:text-amber-400 font-semibold">
                      ⏳ À faire
                    </span>
                  </div>

                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      @click="openEditChallengeModal(ch)"
                      class="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Modifier le défi"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="deleteChallenge(ch)"
                      class="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Supprimer le défi"
                    >
                      <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div class="space-y-1 px-1">
                  <div>
                    <OutlineContent :text="ch.challengeText" :available-images="availableImages" text-class="font-mono text-yellow-600 dark:text-yellow-400 font-medium" />
                  </div>
                  <div v-if="ch.afterChallengeNotes" class="flex items-start justify-between gap-2 text-gray-600 dark:text-gray-300 italic pt-1 group/note">
                    <div class="flex-1">
                      <OutlineContent :text="ch.afterChallengeNotes" :available-images="availableImages" />
                    </div>
                    <button
                      @click.stop="copyNotes(ch)"
                      class="p-1 rounded-md text-emerald-600/70 hover:text-emerald-700 dark:text-emerald-400/70 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center opacity-70 group-hover/note:opacity-100"
                      :title="copiedNotesId === ch.id ? 'Copié dans le presse-papier !' : 'Copier le bilan'"
                    >
                      <UIcon v-if="copiedNotesId === ch.id" name="i-heroicons-check" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <UIcon v-else name="i-heroicons-clipboard-document" class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="isContactChallengesModalOpen = false"
              class="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============================================================ -->
    <!-- MODAL : DÉFI (Ajout / Modification avec Slider de Rang)     -->
    <!-- ============================================================ -->
    <UModal v-model:open="isChallengeModalOpen">
      <template #content>
        <div class="p-6 space-y-6 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ isEditingChallenge ? 'Modifier le défi' : 'Créer un nouveau défi' }}
            </h3>
            <button
              @click="isChallengeModalOpen = false"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="submitChallengeForm" class="space-y-4">
            <!-- Contact Selector -->
            <div v-if="!isEditingChallenge" class="space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Contact associé
              </label>

              <div class="flex gap-4 mb-2">
                <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    v-model="challengeForm.contactMode"
                    type="radio"
                    value="existing"
                    :disabled="contacts.length === 0"
                  />
                  <span>Contact existant ({{ contacts.length }})</span>
                </label>
                <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    v-model="challengeForm.contactMode"
                    type="radio"
                    value="new"
                  />
                  <span>Nouveau contact</span>
                </label>
              </div>

              <div v-if="challengeForm.contactMode === 'existing' && contacts.length > 0" class="space-y-2">
                <div class="flex items-center gap-2">
                  <select
                    v-model="challengeForm.contactId"
                    required
                    class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option v-for="c in contacts" :key="c.id" :value="c.id">
                      {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                    </option>
                  </select>
                  <button
                    type="button"
                    @click="openEditContactFromChallengeModal"
                    :disabled="!challengeForm.contactId"
                    class="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                    title="Modifier les informations de ce contact"
                  >
                    <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                  </button>
                </div>

                <!-- Compact Contact History -->
                <div class="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <span class="flex items-center gap-1">
                      <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                      Historique du contact ({{ modalContactHistory.length }})
                    </span>
                    <span v-if="modalContactHistory.length > 0" class="text-[10px] font-normal text-gray-400">
                      Plus récent en premier
                    </span>
                  </div>

                  <div v-if="modalContactHistory.length === 0" class="text-[11px] text-gray-400 italic py-1">
                    Aucune correspondance ou défi précédent avec ce contact.
                  </div>

                  <div v-else class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <div
                      v-for="h in modalContactHistory"
                      :key="h.id"
                      class="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 text-xs space-y-1"
                    >
                      <div class="flex items-center justify-between text-[11px]">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            :class="h.completedAt
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'"
                          >
                            {{ h.completedAt ? '✓ Accompli' : '⏳ À faire' }}
                          </span>
                          <span class="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                            {{ Number(h.rank ?? 2.5).toFixed(1) }} {{ h.type === 'written' ? 'écrit' : 'oral' }}
                          </span>
                        </div>
                        <span class="text-[10px] text-gray-400 font-mono">
                          {{ formatDateForDisplay(h.completedAt || h.createdAt) }}
                        </span>
                      </div>

                      <div>
                        <OutlineContent :text="h.challengeText" :available-images="availableImages" text-class="text-[11px] font-mono text-yellow-600 dark:text-yellow-400 font-medium" />
                      </div>

                      <div v-if="h.afterChallengeNotes" class="text-[10px] italic text-gray-500 dark:text-gray-400 pt-0.5 border-t border-gray-50 dark:border-gray-700/40">
                        <span class="font-semibold not-italic text-emerald-600 dark:text-emerald-400">Notes :</span>
                        <OutlineContent :text="h.afterChallengeNotes" :available-images="availableImages" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <input
                  v-model="challengeForm.newContactName"
                  type="text"
                  placeholder="Nom du contact (ex: Office de Tourisme...)"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                />
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="challengeForm.newContactEmail"
                    type="text"
                    placeholder="E-mail (optionnel)"
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  />
                  <input
                    v-model="challengeForm.newContactPhone"
                    type="tel"
                    placeholder="Téléphone (optionnel)"
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="challengeForm.newContactUrl"
                    type="text"
                    placeholder="Site Web (optionnel)"
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  />
                  <input
                    v-model="challengeForm.newContactMapUrl"
                    type="url"
                    placeholder="Lien Google Maps (optionnel)"
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <!-- Existing Contact select when editing -->
            <div v-else>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Contact associé
              </label>
              <div class="flex items-center gap-2">
                <select
                  v-model="challengeForm.contactId"
                  required
                  class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option v-for="c in contacts" :key="c.id" :value="c.id">
                    {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                  </option>
                </select>
                <button
                  type="button"
                  @click="openEditContactFromChallengeModal"
                  :disabled="!challengeForm.contactId"
                  class="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                  title="Modifier les informations de ce contact"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Challenge Action Text (Textarea for outline syntax) -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Action du défi * (supporte le format outline et ##images)
              </label>
              <textarea
                v-model="challengeForm.challengeText"
                rows="4"
                placeholder="Ex: Demander par mail les horaires d'ouverture du samedi ##nom_image"
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <!-- Type Selector -->
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                :class="challengeForm.type === 'written'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input
                  v-model="challengeForm.type"
                  type="radio"
                  value="written"
                  class="hidden"
                />
                <span class="text-xl">✍️</span>
                <div>
                  <div class="text-xs font-bold">Écrit</div>
                  <div class="text-[10px] text-gray-500 dark:text-gray-400">E-mail, formulaire, message</div>
                </div>
              </label>

              <label
                class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                :class="challengeForm.type === 'spoken'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                <input
                  v-model="challengeForm.type"
                  type="radio"
                  value="spoken"
                  class="hidden"
                />
                <span class="text-xl">🗣️</span>
                <div>
                  <div class="text-xs font-bold">Oral</div>
                  <div class="text-[10px] text-gray-500 dark:text-gray-400">Téléphone, sur place, vocal</div>
                </div>
              </label>
            </div>

            <!-- Rank Slider: less important (0, green) -> more important (5, red) -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Rang de priorité
                </label>
                <input
                  v-model.number="challengeForm.rank"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  class="w-20 px-2 py-1 text-sm font-semibold text-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
                />
              </div>

              <!-- Range Slider: Less important 0 (Green) to More important 5 (Red) -->
              <input
                v-model.number="challengeForm.rank"
                type="range"
                min="0"
                max="5"
                step="0.1"
                class="w-full h-2 rounded-lg cursor-pointer appearance-none bg-linear-to-r from-emerald-500 via-amber-400 to-rose-500"
              />
              <div class="flex justify-between text-xs font-medium">
                <span class="text-emerald-600 dark:text-emerald-400">moins important</span>
                <span class="text-amber-600 dark:text-amber-400">moyen</span>
                <span class="text-rose-600 dark:text-rose-400">plus important</span>
              </div>
            </div>

            <!-- Completion toggle & fields -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-3">
              <label class="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-800 dark:text-gray-200">
                <input
                  v-model="challengeForm.isFinished"
                  type="checkbox"
                  class="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Ce défi est terminé (accompli)</span>
              </label>

              <div v-if="challengeForm.isFinished" class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Date & heure d'accomplissement
                  </label>
                  <div class="flex gap-2">
                    <input
                      v-model="challengeForm.completedAt"
                      type="text"
                      placeholder="YYYY-MM-DD HH:mm:ss"
                      class="flex-1 px-3 py-2 font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      @click="challengeForm.completedAt = getCurrentTimestamp()"
                      class="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Insérer l'horodatage actuel"
                    >
                      <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                      <span>Maintenant</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Bilan / Réflexions après le défi (supporte outline & images)
                  </label>
                  <textarea
                    v-model="challengeForm.afterChallengeNotes"
                    rows="3"
                    placeholder="Notes, points d'apprentissage, bilan..."
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                @click="isChallengeModalOpen = false"
                class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="challengeSubmitting"
                class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <UIcon v-if="challengeSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>{{ isEditingChallenge ? 'Enregistrer le défi' : 'Créer le défi' }}</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- ============================================================ -->
    <!-- MODAL : BILAN / RÉCAPITULER (depuis l'onglet À faire)         -->
    <!-- ============================================================ -->
    <UModal v-model:open="isReflectModalOpen">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-700 dark:text-gray-300 font-normal">
                  {{ formatTypeAndRank(selectedChallengeForReflect?.type || 'written', selectedChallengeForReflect?.rank) }}
                </span>
                <span class="text-xs text-gray-400">avec</span>
                <span class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ selectedChallengeForReflect?.contact?.name }}
                </span>
              </div>
              <h3 class="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                Terminer & Réfléchir
              </h3>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <OutlineContent :text="selectedChallengeForReflect?.challengeText" :available-images="availableImages" />
              </div>
            </div>
            <button
              @click="isReflectModalOpen = false"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="submitReflection" class="space-y-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Date & heure d'accomplissement
              </label>
              <div class="flex gap-2">
                <input
                  v-model="reflectCompletedAt"
                  type="text"
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  required
                  class="flex-1 px-3 py-2 font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  @click="reflectCompletedAt = getCurrentTimestamp()"
                  class="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Insérer l'horodatage actuel"
                >
                  <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                  <span>Maintenant</span>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Bilan de l'interaction & réflexions (supporte outline & images)
              </label>
              <textarea
                v-model="reflectNotes"
                rows="5"
                placeholder="Décris comment s'est passé l'échange, tes ressentis, tes progrès..."
                class="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                @click="isReflectModalOpen = false"
                class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="reflectSubmitting"
                class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <UIcon v-if="reflectSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>Enregistrer le bilan</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </UModal>
    <!-- ============================================================ -->
    <!-- MODAL : DÉTAIL / AFFICHAGE COMPLET (Contact & Défi)          -->
    <!-- ============================================================ -->
    <UModal v-model:open="isDetailModalOpen">
      <template #content>
        <div class="p-6 space-y-6">
          <!-- Header with Title & Action Edit in the corner -->
          <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {{ detailModalType === 'contact' ? 'Fiche Contact' : 'Détail du Défi' }}
              </span>
              <h3 class="text-xl font-extrabold text-gray-900 dark:text-white">
                {{ detailModalType === 'contact' ? selectedContactForDetail?.name : 'Consultation' }}
              </h3>
            </div>

            <div class="flex items-center gap-2">
              <!-- Edit button in top right corner -->
              <button
                v-if="detailModalType === 'contact' && selectedContactForDetail"
                @click="isDetailModalOpen = false; openEditContactModal(selectedContactForDetail)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                title="Modifier ce contact"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                <span>Modifier</span>
              </button>

              <button
                v-else-if="detailModalType === 'challenge' && selectedChallengeForDetail"
                @click="isDetailModalOpen = false; openEditChallengeModal(selectedChallengeForDetail)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                title="Modifier ce défi"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                <span>Modifier</span>
              </button>

              <button
                @click="isDetailModalOpen = false"
                class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Content: Contact Detail -->
          <div v-if="detailModalType === 'contact' && selectedContactForDetail" class="space-y-4 text-sm">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">E-mail</span>
                <div class="font-medium text-gray-900 dark:text-white break-all">
                  {{ selectedContactForDetail.email || 'Non renseigné' }}
                </div>
              </div>

              <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Téléphone</span>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ selectedContactForDetail.telephone || 'Non renseigné' }}
                </div>
              </div>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Description</span>
              <div v-if="selectedContactForDetail.description" class="text-gray-800 dark:text-gray-200">
                <OutlineContent :text="selectedContactForDetail.description" :available-images="availableImages" />
              </div>
              <div v-else class="text-gray-400 italic text-xs">
                Aucune description fournie.
              </div>
            </div>

            <div v-if="selectedContactForDetail.url || selectedContactForDetail.mapUrl" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-if="selectedContactForDetail.url" class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Site Web</span>
                <div>
                  <a
                    :href="normalizeUrl(selectedContactForDetail.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs break-all"
                  >
                    <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 shrink-0" />
                    <span>{{ formatNiceUrl(selectedContactForDetail.url) }}</span>
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              </div>

              <div v-if="selectedContactForDetail.mapUrl" class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Plan d'accès</span>
                <div>
                  <a
                    :href="selectedContactForDetail.mapUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs"
                  >
                    <UIcon name="i-heroicons-map-pin" class="w-4 h-4 shrink-0" />
                    <span>Ouvrir dans Google Maps</span>
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            <!-- Associated Challenges in Contact View Modal -->
            <div class="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Défis associés ({{ selectedContactDetailChallenges.length }}) :
                </h4>
                <button
                  @click="openCreateChallengeModal(selectedContactForDetail?.id)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                  <span>Nouveau défi</span>
                </button>
              </div>

              <div v-if="selectedContactDetailChallenges.length === 0" class="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
                Aucun défi associé à ce contact pour l'instant.
              </div>

              <div v-else class="space-y-3 max-h-72 overflow-y-auto pr-1">
                <div
                  v-for="ch in selectedContactDetailChallenges"
                  :key="ch.id"
                  class="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/60 text-xs space-y-2"
                >
                  <!-- Top header line with light background separating from text below -->
                  <div class="bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-mono font-semibold text-amber-500 dark:text-amber-300">
                        {{ formatTypeAndRank(ch.type, ch.rank) }}
                      </span>
                      <span v-if="ch.completedAt" class="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Terminé le {{ formatDateForDisplay(ch.completedAt) }}
                      </span>
                      <span v-else class="text-amber-600 dark:text-amber-400 font-semibold">
                        ⏳ À faire
                      </span>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        @click="openEditChallengeModal(ch)"
                        class="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Modifier le défi"
                      >
                        <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                      </button>
                      <button
                        @click="deleteChallenge(ch)"
                        class="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Supprimer le défi"
                      >
                        <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div class="space-y-1 px-1">
                    <div>
                      <OutlineContent :text="ch.challengeText" :available-images="availableImages" text-class="font-mono text-yellow-600 dark:text-yellow-400 font-medium" />
                    </div>
                    <div v-if="ch.afterChallengeNotes" class="text-gray-600 dark:text-gray-300 italic pt-1">
                      <OutlineContent :text="ch.afterChallengeNotes" :available-images="availableImages" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Créé le {{ new Date(selectedContactForDetail.createdAt).toLocaleString('fr-FR') }}</span>
              <span>{{ challenges.filter(c => c.contactId === selectedContactForDetail?.id).length }} défis enregistrés</span>
            </div>
          </div>

          <!-- Content: Challenge Detail -->
          <div v-else-if="detailModalType === 'challenge' && selectedChallengeForDetail" class="space-y-4 text-sm">
            <!-- Contact Bar: Centered, highlighted with top and bottom borders, larger font -->
            <div class="flex items-center justify-center gap-2 p-3 border-y border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/50 rounded-sm text-center">
              <button
                v-if="selectedChallengeForDetail.contact"
                @click="openContactDetailModal(selectedChallengeForDetail.contact)"
                class="font-bold text-base text-indigo-900 dark:text-indigo-100 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                title="Afficher la fiche du contact"
              >
                {{ selectedChallengeForDetail.contact.name }}
              </button>
              <span v-else class="font-bold text-base text-indigo-900 dark:text-indigo-100">Contact</span>
              <a
                v-if="selectedChallengeForDetail.contact?.url"
                :href="normalizeUrl(selectedChallengeForDetail.contact.url)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center"
                :title="selectedChallengeForDetail.contact.url"
              >
                <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
              </a>
              <a
                v-if="selectedChallengeForDetail.contact?.mapUrl"
                :href="selectedChallengeForDetail.contact.mapUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center"
                title="Google Maps"
              >
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              </a>
            </div>

            <!-- Challenge Text -->
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Texte du défi</span>
                <button
                  @click="copyChallengeText(selectedChallengeForDetail)"
                  class="p-1 rounded-md text-yellow-600/80 hover:text-yellow-700 dark:text-yellow-400/80 dark:hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                  :title="copiedChallengeId === selectedChallengeForDetail.id ? 'Copié dans le presse-papier !' : 'Copier l\'action du défi'"
                >
                  <UIcon v-if="copiedChallengeId === selectedChallengeForDetail.id" name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
                </button>
              </div>
              <div class="text-base text-gray-900 dark:text-white leading-relaxed">
                <OutlineContent :text="selectedChallengeForDetail.challengeText" :available-images="availableImages" text-class="text-yellow-600 dark:text-yellow-400 font-medium" />
              </div>
            </div>

            <!-- After challenge notes / reflection -->
            <div
              v-if="selectedChallengeForDetail.afterChallengeNotes"
              class="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-4 h-4" />
                  <span>Bilan / Réflexions après le défi</span>
                </div>
                <button
                  @click="copyNotes(selectedChallengeForDetail)"
                  class="p-1 rounded-md text-emerald-700/80 hover:text-emerald-800 dark:text-emerald-300/80 dark:hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center"
                  :title="copiedNotesId === selectedChallengeForDetail.id ? 'Copié dans le presse-papier !' : 'Copier le bilan'"
                >
                  <UIcon v-if="copiedNotesId === selectedChallengeForDetail.id" name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <UIcon v-else name="i-heroicons-clipboard-document" class="w-4 h-4" />
                </button>
              </div>
              <div class="text-sm text-emerald-950 dark:text-emerald-100 italic leading-relaxed max-h-48 overflow-y-auto pr-1.5">
                <OutlineContent :text="selectedChallengeForDetail.afterChallengeNotes" :available-images="availableImages" />
              </div>
            </div>

            <!-- Status & Timestamps -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Statut :</span>
                <span
                  class="font-bold"
                  :class="selectedChallengeForDetail.completedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
                >
                  {{ selectedChallengeForDetail.completedAt ? 'Accompli' : 'À faire' }}
                </span>
              </div>
              <div v-if="selectedChallengeForDetail.completedAt" class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Date d'accomplissement :</span>
                <span class="font-mono text-gray-800 dark:text-gray-200">{{ formatDateForDisplay(selectedChallengeForDetail.completedAt) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Date de création :</span>
                <span class="font-mono text-gray-800 dark:text-gray-200">{{ formatDateForDisplay(selectedChallengeForDetail.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="isDetailModalOpen = false"
              class="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============================================================ -->
    <!-- MODAL : CHOISIR UN DÉFI EXISTANT                             -->
    <!-- ============================================================ -->
    <UModal v-model:open="isSelectExistingModalOpen">
      <template #content>
        <div class="p-6 space-y-6">
          <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Défis disponibles ({{ availableUnselectedChallenges.length }})
              </span>
              <h3 class="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                Choisir un défi existant
              </h3>
            </div>
            <button
              @click="isSelectExistingModalOpen = false"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- Dropdown selector -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Sélectionner un défi dans la liste
              </label>
              <select
                v-model="selectedChallengeToAddId"
                class="w-full text-sm py-2.5 px-3 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option
                  v-for="ch in availableUnselectedChallenges"
                  :key="ch.id"
                  :value="ch.id"
                >
                  {{ Number(ch.rank ?? 2.5).toFixed(1) }} {{ ch.type === 'written' ? 'écrit' : 'oral' }} - {{ ch.contact?.name ? ch.contact.name + ' : ' : '' }}{{ ch.challengeText.slice(0, 60) }}...
                </option>
              </select>
            </div>

            <!-- Preview of the selected challenge -->
            <div v-if="selectedChallengeToAdd" class="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <UIcon name="i-heroicons-user" class="w-4 h-4" />
                  {{ selectedChallengeToAdd.contact?.name || 'Contact sans nom' }}
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {{ Number(selectedChallengeToAdd.rank ?? 2.5).toFixed(1) }} {{ selectedChallengeToAdd.type === 'written' ? 'écrit' : 'oral' }}
                </span>
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                <OutlineContent :text="selectedChallengeToAdd.challengeText" :available-images="availableImages" />
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              @click="isSelectExistingModalOpen = false"
              class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              @click="addSelectedChallengeToToday"
              :disabled="!selectedChallengeToAdd"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4" />
              <span>Ajouter ce défi</span>
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
