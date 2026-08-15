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
const fetchData = async () => {
  loading.value = true
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
    if (challengesRes.success) {
      challenges.value = challengesRes.data
    }
    if (contactsRes.success) {
      contacts.value = contactsRes.data
    }
    if (imagesRes && imagesRes.images) {
      availableImages.value = imagesRes.images
    }
  } catch (err) {
    console.error('Erreur lors du chargement des données:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
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

// Active chosen challenge ID for the Doing card (supports swapping)
const activeDoingChallengeId = ref<string | null>(null)

// Current Doing challenge computed
const currentDoingChallenge = computed(() => {
  if (sortedTodoChallenges.value.length === 0) return null
  if (activeDoingChallengeId.value) {
    const found = sortedTodoChallenges.value.find((c) => c.id === activeDoingChallengeId.value)
    if (found) return found
  }
  return sortedTodoChallenges.value[0]
})

// Other available challenges for swap dropdown
const swapCandidateChallenges = computed(() => {
  if (!currentDoingChallenge.value) return []
  return sortedTodoChallenges.value.filter((c) => c.id !== currentDoingChallenge.value?.id)
})

// Top Panel: 5 daily goal slots
// If all 5 completed => all 5 green
// If not all 5 completed:
//   - finished challenges today => green
//   - if no todo challenges available => remaining are red ("Créer un défi")
//   - if 1 or more available => exactly 1 slot is yellow ("En cours" / Doing)
//   - remaining slots => red ("Créer un défi")
const dailyGoalSlots = computed(() => {
  const goalCount = Math.max(1, dailyTarget.value || 1)
  const slots: Array<{
    status: 'finished' | 'doing' | 'empty'
    challenge?: Challenge
  }> = []

  // 1. Finished challenges today
  for (let i = 0; i < finishedTodayChallenges.value.length && slots.length < goalCount; i++) {
    slots.push({
      status: 'finished',
      challenge: finishedTodayChallenges.value[i],
    })
  }

  // 2. If slots left and todo challenges available, add exactly 1 doing challenge (yellow)
  if (slots.length < goalCount && currentDoingChallenge.value) {
    slots.push({
      status: 'doing',
      challenge: currentDoingChallenge.value,
    })
  }

  // 3. All remaining slots are empty (red/gray)
  while (slots.length < goalCount) {
    slots.push({
      status: 'empty',
    })
  }

  return slots
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
  try {
    await $fetch('/api/settings', {
      method: 'POST',
      body: {
        key: 'daily_challenge_target',
        value: String(targetInput.value),
      },
    })
    dailyTarget.value = targetInput.value
    isEditingTarget.value = false
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l’objectif:', err)
  }
}

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

const submitContactForm = async () => {
  if (!contactForm.value.name.trim()) return
  contactSubmitting.value = true
  try {
    await $fetch('/api/contacts', {
      method: 'POST',
      body: {
        id: isEditingContact.value ? contactForm.value.id : undefined,
        name: contactForm.value.name.trim(),
        email: contactForm.value.email.trim() || undefined,
        telephone: contactForm.value.telephone.trim() || undefined,
        description: contactForm.value.description.trim() || undefined,
        mapUrl: contactForm.value.mapUrl.trim() || undefined,
        url: contactForm.value.url.trim() || undefined,
      },
    })
    isContactModalOpen.value = false
    await fetchData()
    if (activeContactForChallenges.value && isEditingContact.value && activeContactForChallenges.value.id === contactForm.value.id) {
      activeContactForChallenges.value = contacts.value.find((c) => c.id === contactForm.value.id) || null
    }
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du contact:', err)
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

  try {
    await $fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
    if (activeContactForChallenges.value?.id === contact.id) {
      isContactChallengesModalOpen.value = false
      activeContactForChallenges.value = null
    }
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du contact:', err)
  }
}

const openContactChallengesModal = (contact: Contact) => {
  activeContactForChallenges.value = contact
  isContactChallengesModalOpen.value = true
}

// Challenge CRUD Handlers
const openCreateChallengeModal = (presetContactId?: string, defaultFinished = false) => {
  isEditingChallenge.value = false
  editingChallengeId.value = ''
  
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

const submitChallengeForm = async () => {
  if (!challengeForm.value.challengeText.trim()) return
  challengeSubmitting.value = true
  try {
    if (isEditingChallenge.value) {
      // Update
      const payload: any = {
        challengeText: challengeForm.value.challengeText.trim(),
        type: challengeForm.value.type,
        contactId: challengeForm.value.contactId,
        rank: Number(challengeForm.value.rank) || 2.5,
        afterChallengeNotes: challengeForm.value.afterChallengeNotes.trim() || null,
        completedAt: challengeForm.value.isFinished && challengeForm.value.completedAt
          ? new Date(challengeForm.value.completedAt).toISOString()
          : (challengeForm.value.isFinished ? new Date().toISOString() : null),
      }

      await $fetch(`/api/challenges/${editingChallengeId.value}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      // Create
      const payload: any = {
        challengeText: challengeForm.value.challengeText.trim(),
        type: challengeForm.value.type,
        rank: Number(challengeForm.value.rank) || 2.5,
      }

      if (challengeForm.value.contactMode === 'existing') {
        payload.contactId = challengeForm.value.contactId
      } else {
        payload.newContactName = challengeForm.value.newContactName.trim()
        payload.newContactEmail = challengeForm.value.newContactEmail.trim() || undefined
        payload.newContactPhone = challengeForm.value.newContactPhone.trim() || undefined
        payload.newContactDescription = challengeForm.value.newContactDescription.trim() || undefined
        payload.newContactMapUrl = challengeForm.value.newContactMapUrl.trim() || undefined
        payload.newContactUrl = challengeForm.value.newContactUrl.trim() || undefined
      }

      const res = await $fetch<{ success: boolean; data: Challenge }>('/api/challenges', {
        method: 'POST',
        body: payload,
      })

      if (res.success && challengeForm.value.isFinished && res.data?.id) {
        await $fetch(`/api/challenges/${res.data.id}/complete`, {
          method: 'POST',
          body: {
            completedAt: challengeForm.value.completedAt
              ? new Date(challengeForm.value.completedAt).toISOString()
              : new Date().toISOString(),
            afterChallengeNotes: challengeForm.value.afterChallengeNotes.trim() || null,
          },
        })
      }
    }

    isChallengeModalOpen.value = false
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du défi:', err)
  } finally {
    challengeSubmitting.value = false
  }
}

const deleteChallenge = async (challenge: Challenge) => {
  if (!confirm(`Es-tu sûr(e) de vouloir supprimer ce défi ?`)) return
  try {
    await $fetch(`/api/challenges/${challenge.id}`, { method: 'DELETE' })
    if (activeDoingChallengeId.value === challenge.id) {
      activeDoingChallengeId.value = null
    }
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du défi:', err)
  }
}

const handleDoingDropdownChange = (event: any, contactId?: string) => {
  const val = event.target.value
  if (val === '__CREATE__') {
    event.target.value = activeDoingChallengeId.value || currentDoingChallenge.value?.id || ''
    openCreateChallengeModal(contactId, false)
  } else if (val) {
    activeDoingChallengeId.value = val
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
  try {
    const res = await $fetch<{ success: boolean; data: Challenge }>(
      `/api/challenges/${selectedChallengeForReflect.value.id}/complete`,
      {
        method: 'POST',
        body: {
          completedAt: new Date(reflectCompletedAt.value).toISOString(),
          afterChallengeNotes: reflectNotes.value,
        },
      }
    )
    if (res.success) {
      isReflectModalOpen.value = false
      if (activeDoingChallengeId.value === selectedChallengeForReflect.value.id) {
        activeDoingChallengeId.value = null
      }
      await fetchData()
    }
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du bilan:', err)
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
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4 text-center sm:text-left">
        <div class="flex flex-col sm:flex-row sm:items-center items-center gap-2.5">
          <!-- Calendar icon hidden on mobile, visible on sm and up -->
          <UIcon name="i-heroicons-calendar-days" class="hidden sm:block w-6 h-6 text-indigo-500 shrink-0 self-center" />
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

        <!-- Target Setting (Centered on mobile) -->
        <div class="flex items-center justify-center gap-3">
          <div v-if="!loading && !isEditingTarget" class="flex items-center gap-2">
            <div class="flex flex-col items-center">
              <span class="text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-400 leading-none tracking-tight">
                {{ dailyTarget }}
              </span>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">
                par jour
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
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <template v-for="(slot, index) in dailyGoalSlots" :key="index">
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

              <!-- Full Challenge Content without truncation -->
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                <OutlineContent :text="slot.challenge.challengeText" :available-images="availableImages" />
              </div>

              <!-- After Challenge Notes -->
              <div
                v-if="slot.challenge.afterChallengeNotes"
                class="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200"
              >
                <div class="font-bold mb-0.5 flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-3.5 h-3.5" />
                  <span>Bilan :</span>
                </div>
                <div class="italic">
                  <OutlineContent :text="slot.challenge.afterChallengeNotes" :available-images="availableImages" />
                </div>
              </div>
            </div>

            <div class="pt-3 mt-4 border-t border-emerald-200/50 dark:border-emerald-900/50 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <button
                  v-if="slot.challenge.contact"
                  @click="openContactDetailModal(slot.challenge.contact)"
                  class="font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors cursor-pointer text-left"
                  title="Afficher les détails du contact"
                >
                  {{ slot.challenge.contact.name }}
                </button>
                <span v-else class="font-bold text-emerald-700 dark:text-emerald-300">Contact</span>
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
              <span class="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Terminé
              </span>
            </div>
          </div>

          <!-- 2. Doing / Active Available Todo Challenge Card (Yellow / Amber) -->
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
                </div>
              </div>

              <!-- Full Challenge Content without truncation -->
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                <OutlineContent :text="slot.challenge.challengeText" :available-images="availableImages" />
              </div>

              <!-- Dropdown or Yellow Create Button -->
              <div class="pt-2">
                <!-- If only 1 challenge available (0 swap candidates): show centered yellow "Créer un défi" button -->
                <div v-if="swapCandidateChallenges.length === 0" class="flex justify-center">
                  <button
                    @click="openCreateChallengeModal(slot.challenge?.contactId, false)"
                    class="px-4 py-1.5 rounded-lg bg-amber-200/90 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-950 dark:text-amber-100 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer border border-amber-400/80 dark:border-amber-700/80"
                  >
                    <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-amber-700 dark:text-amber-300" />
                    <span>Créer un défi</span>
                  </button>
                </div>

                <!-- If multiple challenges available: show swap dropdown -->
                <div v-else class="relative w-full">
                  <select
                    :value="slot.challenge.id"
                    @change="(e: any) => handleDoingDropdownChange(e, slot.challenge?.contactId)"
                    class="w-full text-xs py-1.5 pl-3 pr-8 rounded-lg bg-amber-100/70 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-950/90 text-amber-950 dark:text-amber-100 font-medium border border-amber-300/80 dark:border-amber-700/80 cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  >
                    <option :value="slot.challenge.id" class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold py-1">
                      Changer de défi ({{ swapCandidateChallenges.length }} dispo)
                    </option>
                    <option value="__CREATE__" class="font-bold text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-900 py-1">
                      ⊕ Créer un défi
                    </option>
                    <option
                      v-for="alt in swapCandidateChallenges"
                      :key="alt.id"
                      :value="alt.id"
                      class="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 py-1"
                    >
                      {{ Number(alt.rank ?? 2.5).toFixed(1) }} {{ alt.type === 'written' ? 'écrit' : 'oral' }} - {{ alt.contact?.name ? alt.contact.name + ': ' : '' }}{{ alt.challengeText.slice(0, 45) }}...
                    </option>
                  </select>
                  <UIcon name="i-heroicons-chevron-up-down" class="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-700 dark:text-amber-300" />
                </div>
              </div>
            </div>

            <!-- Bottom Area of Yellow Card -->
            <!-- Mobile View: Line 1 (Contact + En cours), Line 2 (Terminer button centered) -->
            <div class="pt-3 mt-4 border-t border-amber-200/60 dark:border-amber-900/50 text-xs">
              <!-- Desktop layout (>= md) -->
              <div class="hidden md:flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <button
                    v-if="slot.challenge.contact"
                    @click="openContactDetailModal(slot.challenge.contact)"
                    class="font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors cursor-pointer text-left"
                    title="Afficher les détails du contact"
                  >
                    {{ slot.challenge.contact.name }}
                  </button>
                  <span v-else class="font-bold text-amber-700 dark:text-amber-300">Contact</span>
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
                <div class="flex items-center gap-2.5">
                  <button
                    @click="openReflectModal(slot.challenge)"
                    class="px-3.5 py-1.5 rounded-lg border border-emerald-500 hover:border-emerald-600 text-emerald-700 hover:text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 dark:border-emerald-500/80 dark:text-emerald-300 dark:hover:text-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Valider et faire le bilan"
                  >
                    <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-2" />
                    <span>Terminer</span>
                  </button>
                  <span class="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                    En cours
                  </span>
                </div>
              </div>

              <!-- Mobile layout (< md): Line 1 (Contact + En cours), Line 2 (Centered Terminer button) -->
              <div class="flex flex-col gap-2.5 md:hidden">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <button
                      v-if="slot.challenge.contact"
                      @click="openContactDetailModal(slot.challenge.contact)"
                      class="font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors cursor-pointer text-left"
                      title="Afficher les détails du contact"
                    >
                      {{ slot.challenge.contact.name }}
                    </button>
                    <span v-else class="font-bold text-amber-700 dark:text-amber-300">Contact</span>
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
                  <span class="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                    En cours
                  </span>
                </div>

                <div class="flex justify-center pt-1">
                  <button
                    @click="openReflectModal(slot.challenge)"
                    class="w-full sm:w-auto px-6 py-2 rounded-lg border border-emerald-500 hover:border-emerald-600 text-emerald-700 hover:text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 dark:border-emerald-500/80 dark:text-emerald-300 dark:hover:text-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-950/90 font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    title="Valider et faire le bilan"
                  >
                    <UIcon name="i-heroicons-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-2" />
                    <span>Terminer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Empty / Not Available Card (Gray) -->
          <div
            v-else
            class="relative rounded-2xl p-5 border-2 transition-all flex flex-col items-center justify-center text-center min-h-[170px]"
            :class="getSlotCardBorderClass('empty')"
          >
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Emplacement #{{ index + 1 }} non disponible
            </span>
            <button
              @click="openCreateChallengeModal(undefined, false)"
              class="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200/80 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-300 border border-gray-300 dark:border-gray-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:scale-105"
            >
              <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span>Créer un défi</span>
            </button>
          </div>
        </template>
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
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {{ contact.description || '—' }}
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

            <div class="text-sm font-medium text-gray-900 dark:text-white">
              <OutlineContent :text="challenge.challengeText" :available-images="availableImages" />
            </div>

            <div class="text-xs">
              <button
                v-if="challenge.contact"
                @click="openContactDetailModal(challenge.contact)"
                class="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer text-left"
              >
                {{ challenge.contact.name }}
              </button>
              <span v-else class="text-gray-400">Contact inconnu</span>
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
                    <OutlineContent :text="challenge.challengeText" :available-images="availableImages" />
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
                    <OutlineContent v-if="challenge.afterChallengeNotes" :text="challenge.afterChallengeNotes" :available-images="availableImages" :max-lines="3" />
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

            <div class="text-sm font-medium text-gray-900 dark:text-white">
              <OutlineContent :text="challenge.challengeText" :available-images="availableImages" />
            </div>

            <div class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <button
                v-if="challenge.contact"
                @click="openContactDetailModal(challenge.contact)"
                class="hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer text-left"
              >
                {{ challenge.contact.name }}
              </button>
              <span v-else>Contact inconnu</span>
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

                  <!-- Text (Outline content rendered without truncation) -->
                  <td class="px-5 py-4 text-gray-900 dark:text-white max-w-md">
                    <OutlineContent :text="challenge.challengeText" :available-images="availableImages" />
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
                <tr
                  v-for="item in historyByDay"
                  :key="item.dateKey"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- Day column -->
                  <td class="px-5 py-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    <div class="flex items-center gap-2">
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
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold"
                        :class="item.targetReached
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'"
                      >
                        <UIcon v-if="item.targetReached" name="i-heroicons-check" class="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                        {{ item.count }} {{ item.count > 1 ? 'défis accomplis' : 'défi accompli' }}
                      </span>
                    </div>
                  </td>
                </tr>
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
              @click="isContactModalOpen = false"
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
                  type="email"
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
                @click="isContactModalOpen = false"
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
              <p v-if="activeContactForChallenges?.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ activeContactForChallenges.description }}
              </p>
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
                  <div class="text-gray-900 dark:text-white">
                    <OutlineContent :text="ch.challengeText" :available-images="availableImages" />
                  </div>
                  <div v-if="ch.afterChallengeNotes" class="text-gray-600 dark:text-gray-300 italic pt-1">
                    <OutlineContent :text="ch.afterChallengeNotes" :available-images="availableImages" />
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

              <div v-if="challengeForm.contactMode === 'existing' && contacts.length > 0">
                <select
                  v-model="challengeForm.contactId"
                  required
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option v-for="c in contacts" :key="c.id" :value="c.id">
                    {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                  </option>
                </select>
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
                    type="email"
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
              <select
                v-model="challengeForm.contactId"
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option v-for="c in contacts" :key="c.id" :value="c.id">
                  {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                </option>
              </select>
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

            <!-- Rank Slider: easy (0, green) -> challenging (5, red) -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rang de priorité
              </label>

              <!-- Range Slider: Easy 0 (Green) to Challenging 5 (Red) -->
              <input
                v-model.number="challengeForm.rank"
                type="range"
                min="0"
                max="5"
                step="0.1"
                class="w-full h-2 rounded-lg cursor-pointer appearance-none bg-linear-to-r from-emerald-500 via-amber-400 to-rose-500"
              />
              <div class="flex justify-between text-xs font-medium">
                <span class="text-emerald-600 dark:text-emerald-400">Facile</span>
                <span class="text-amber-600 dark:text-amber-400">Moyen</span>
                <span class="text-rose-600 dark:text-rose-400">Difficile</span>
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
              <div class="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                {{ selectedContactForDetail.description || 'Aucune description fournie.' }}
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
                    <div class="text-gray-900 dark:text-white">
                      <OutlineContent :text="ch.challengeText" :available-images="availableImages" />
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
            <!-- Contact Bar -->
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-user" class="w-4 h-4 text-indigo-500" />
                <span class="font-bold text-gray-900 dark:text-white">{{ selectedChallengeForDetail.contact?.name || 'Contact' }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-semibold text-gray-800 dark:text-gray-200">
                  {{ Number(selectedChallengeForDetail.rank ?? 2.5).toFixed(1) }} {{ selectedChallengeForDetail.type === 'written' ? 'écrit ✍️' : 'oral 🗣️' }}
                </span>
              </div>
            </div>

            <!-- Challenge Text -->
            <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Texte du défi</span>
              <div class="text-base text-gray-900 dark:text-white leading-relaxed">
                <OutlineContent :text="selectedChallengeForDetail.challengeText" :available-images="availableImages" />
              </div>
            </div>

            <!-- After challenge notes / reflection -->
            <div
              v-if="selectedChallengeForDetail.afterChallengeNotes"
              class="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-2"
            >
              <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-4 h-4" />
                <span>Bilan / Réflexions après le défi</span>
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
  </div>
</template>
