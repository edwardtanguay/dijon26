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
  createdAt: string
  updatedAt: string
  challenges?: Challenge[]
}

interface Challenge {
  id: string
  contactId: string
  contact?: Contact
  text: string
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
const dailyTarget = ref<number>(10)
const isEditingTarget = ref(false)
const targetInput = ref<number>(10)
const loading = ref(true)

// Active Tab: contacts | finished | todo
const activeTab = ref<'contacts' | 'finished' | 'todo'>('contacts')

// Search states
const searchContacts = ref('')
const searchFinished = ref('')

// Modals state
const isContactModalOpen = ref(false)
const isEditingContact = ref(false)
const contactForm = ref({
  id: '',
  name: '',
  email: '',
  telephone: '',
  description: '',
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
  text: '',
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

// Fetch Data
const fetchData = async () => {
  loading.value = true
  try {
    const [settingsRes, challengesRes, contactsRes] = await Promise.all([
      $fetch<{ success: boolean; data: any }>('/api/settings'),
      $fetch<{ success: boolean; data: Challenge[] }>('/api/challenges'),
      $fetch<{ success: boolean; data: Contact[] }>('/api/contacts'),
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
  } catch (err) {
    console.error('Erreur lors du chargement des données:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Date helpers
const getLocalDateString = (d: Date | string | null = new Date()) => {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayStr = computed(() => getLocalDateString(new Date()))

// Challenge Categories:
// 1. Finished Challenges (completedAt != null)
const finishedChallenges = computed(() => {
  return challenges.value.filter((c) => !!c.completedAt)
})

// Finished today specifically
const finishedTodayChallenges = computed(() => {
  return challenges.value.filter((c) => {
    if (!c.completedAt) return false
    return getLocalDateString(c.completedAt) === todayStr.value
  })
})

// 2. Todo challenges (completedAt == null)
const todoChallenges = computed(() => {
  return challenges.value.filter((c) => !c.completedAt)
})

// Today / Tomorrow dynamic calculation
// Target = dailyTarget.value
// todayDone = finishedTodayChallenges.length
// todoPool = todoChallenges.length
const todayDoneCount = computed(() => finishedTodayChallenges.value.length)
const todoPoolCount = computed(() => todoChallenges.value.length)

const todayMissing = computed(() => {
  const missing = dailyTarget.value - todayDoneCount.value
  return missing > 0 ? missing : 0
})

const tomorrowMissing = computed(() => {
  // reserve left in todo pool after satisfying today's deficit
  const remainingTodoAfterToday = Math.max(0, todoPoolCount.value - todayMissing.value)
  const missingTomorrow = dailyTarget.value - remainingTodoAfterToday
  return missingTomorrow > 0 ? missingTomorrow : 0
})

// Filtered Lists
// Tab 1: Contacts (whenCreated desc)
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

// Tab 2: Finished Challenges (whenFinished desc)
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
    const text = c.text.toLowerCase()
    const notes = c.afterChallengeNotes?.toLowerCase() || ''
    return text.includes(q) || contactName.includes(q) || notes.includes(q)
  })
})

// Tab 3: Todo Challenges (rank desc)
const sortedTodoChallenges = computed(() => {
  return [...todoChallenges.value].sort((a, b) => {
    return (b.rank ?? 2.5) - (a.rank ?? 2.5)
  })
})

// Contact's challenges sorted by whenFinished ascending (completedAt asc, pending last)
const activeContactChallenges = computed(() => {
  if (!activeContactForChallenges.value) return []
  const cId = activeContactForChallenges.value.id
  const list = challenges.value.filter((c) => c.contactId === cId)
  return list.sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    }
    if (a.completedAt && !b.completedAt) return -1
    if (!a.completedAt && b.completedAt) return 1
    return (b.rank ?? 2.5) - (a.rank ?? 2.5)
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

// ---------------------------
// Contact CRUD Handlers
// ---------------------------
const openCreateContactModal = () => {
  isEditingContact.value = false
  contactForm.value = {
    id: '',
    name: '',
    email: '',
    telephone: '',
    description: '',
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
      },
    })
    isContactModalOpen.value = false
    await fetchData()
    // Update active contact if modal was opened
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

// ---------------------------
// Challenge CRUD Handlers
// ---------------------------
const openCreateChallengeModal = (presetContactId?: string, defaultFinished = false) => {
  isEditingChallenge.value = false
  editingChallengeId.value = ''
  
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const currentLocalDt = `${year}-${month}-${day}T${hours}:${minutes}`

  challengeForm.value = {
    contactMode: contacts.value.length > 0 ? 'existing' : 'new',
    contactId: presetContactId || contacts.value[0]?.id || '',
    newContactName: '',
    newContactEmail: '',
    newContactPhone: '',
    newContactDescription: '',
    text: '',
    type: 'written',
    rank: 2.5,
    isFinished: defaultFinished,
    completedAt: defaultFinished ? currentLocalDt : '',
    afterChallengeNotes: '',
  }
  isChallengeModalOpen.value = true
}

const openEditChallengeModal = (challenge: Challenge) => {
  isEditingChallenge.value = true
  editingChallengeId.value = challenge.id

  let formattedDate = ''
  if (challenge.completedAt) {
    const d = new Date(challenge.completedAt)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
  }

  challengeForm.value = {
    contactMode: 'existing',
    contactId: challenge.contactId,
    newContactName: '',
    newContactEmail: '',
    newContactPhone: '',
    newContactDescription: '',
    text: challenge.text,
    type: challenge.type,
    rank: challenge.rank ?? 2.5,
    isFinished: !!challenge.completedAt,
    completedAt: formattedDate,
    afterChallengeNotes: challenge.afterChallengeNotes || '',
  }
  isChallengeModalOpen.value = true
}

const submitChallengeForm = async () => {
  if (!challengeForm.value.text.trim()) return
  challengeSubmitting.value = true
  try {
    if (isEditingChallenge.value) {
      // Update
      const payload: any = {
        text: challengeForm.value.text.trim(),
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
        text: challengeForm.value.text.trim(),
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
      }

      const res = await $fetch<{ success: boolean; data: Challenge }>('/api/challenges', {
        method: 'POST',
        body: payload,
      })

      // If created as finished right away, update its completedAt & notes
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
  if (!confirm(`Es-tu sûr(e) de vouloir supprimer le défi : "${challenge.text}" ?`)) return
  try {
    await $fetch(`/api/challenges/${challenge.id}`, { method: 'DELETE' })
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du défi:', err)
  }
}

// ---------------------------
// Reflection / Completion Handlers
// ---------------------------
const openReflectModal = (challenge: Challenge) => {
  selectedChallengeForReflect.value = challenge
  reflectNotes.value = challenge.afterChallengeNotes || ''

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  reflectCompletedAt.value = `${year}-${month}-${day}T${hours}:${minutes}`

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
      await fetchData()
    }
  } catch (err) {
    console.error('Erreur lors de l’enregistrement du bilan:', err)
  } finally {
    reflectSubmitting.value = false
  }
}

// Helpers for color dynamic classes on slider and indicators
const getRankBadgeClass = (rank: number) => {
  if (rank >= 4) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (rank >= 2.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
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

      <div class="flex items-center gap-3 self-start md:self-auto">
        <button
          @click="openCreateChallengeModal()"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <UIcon name="i-heroicons-plus" class="w-5 h-5" />
          <span>Nouveau défi</span>
        </button>
      </div>
    </div>

    <!-- Top Panel: Define challenges for today and tomorrow -->
    <div class="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/60 pb-4">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-indigo-500" />
          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            Définir les défis pour aujourd'hui et demain
          </h2>
        </div>

        <!-- Target Setting -->
        <div class="flex items-center gap-2 text-xs">
          <span class="text-gray-500 dark:text-gray-400">Objectif journalier :</span>
          <div v-if="!isEditingTarget" class="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
            <span>{{ dailyTarget }} défis / jour</span>
            <button
              @click="isEditingTarget = true"
              class="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Modifier l'objectif quotidien"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
            </button>
          </div>
          <div v-else class="flex items-center gap-1.5">
            <input
              v-model.number="targetInput"
              type="number"
              min="1"
              max="100"
              class="w-14 px-2 py-0.5 text-xs font-bold border rounded border-indigo-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
            <button
              @click="saveDailyTarget"
              class="px-2 py-0.5 font-semibold bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500"
            >
              OK
            </button>
            <button
              @click="isEditingTarget = false"
              class="px-2 py-0.5 font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

      <!-- Indicators Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <!-- Today Status Card -->
        <div
          class="p-4 rounded-xl border flex items-center justify-between"
          :class="todayMissing > 0
            ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
            : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'"
        >
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Aujourd'hui
            </span>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {{ todayDoneCount }} accompli{{ todayDoneCount > 1 ? 's' : '' }} / {{ dailyTarget }} visés
            </div>
          </div>

          <div
            class="px-3.5 py-1.5 rounded-full font-black text-sm flex items-center gap-1 shadow-xs"
            :class="todayMissing > 0
              ? 'bg-red-500 text-white'
              : 'bg-emerald-500 text-white'"
          >
            <span>aujourd'hui : {{ todayMissing > 0 ? `+${todayMissing}` : '0' }}</span>
          </div>
        </div>

        <!-- Tomorrow Status Card -->
        <div
          class="p-4 rounded-xl border flex items-center justify-between"
          :class="tomorrowMissing > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
            : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'"
        >
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Demain
            </span>
            <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {{ todoPoolCount }} en réserve à faire
            </div>
          </div>

          <div
            class="px-3.5 py-1.5 rounded-full font-black text-sm flex items-center gap-1 shadow-xs"
            :class="tomorrowMissing > 0
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-500 text-white'"
          >
            <span>demain : {{ tomorrowMissing > 0 ? `+${tomorrowMissing}` : '0' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-800">
      <div class="flex space-x-2 sm:space-x-6">
        <!-- Tab 1: Contacts -->
        <button
          @click="activeTab = 'contacts'"
          class="py-3.5 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'contacts'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
          <span>{{ contacts.length }} Contacts</span>
        </button>

        <!-- Tab 2: Challenges finished -->
        <button
          @click="activeTab = 'finished'"
          class="py-3.5 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'finished'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
          <span>{{ finishedChallenges.length }} Défis terminés</span>
        </button>

        <!-- Tab 3: Challenges todo -->
        <button
          @click="activeTab = 'todo'"
          class="py-3.5 px-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'todo'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <UIcon name="i-heroicons-queue-list" class="w-4 h-4" />
          <span>{{ todoChallenges.length }} Défis à faire</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
      <p>Chargement des données...</p>
    </div>

    <div v-else class="space-y-4">
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
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
            <span>Nouveau contact</span>
          </button>
        </div>

        <!-- Contacts Table -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Contact</th>
                  <th class="px-5 py-3.5">Coordonnées</th>
                  <th class="px-5 py-3.5">Description</th>
                  <th class="px-5 py-3.5">Créé le</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <tr v-if="filteredContacts.length === 0">
                  <td colspan="5" class="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun contact trouvé.
                  </td>
                </tr>
                <tr
                  v-for="contact in filteredContacts"
                  :key="contact.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- Contact Name -->
                  <td class="px-5 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    <div class="flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                        {{ contact.name.charAt(0).toUpperCase() }}
                      </div>
                      <span>{{ contact.name }}</span>
                    </div>
                  </td>

                  <!-- Contact Info -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                    <div class="space-y-0.5">
                      <div v-if="contact.email" class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-envelope" class="w-3.5 h-3.5 text-gray-400" />
                        <span>{{ contact.email }}</span>
                      </div>
                      <div v-if="contact.telephone" class="flex items-center gap-1.5">
                        <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 text-gray-400" />
                        <span>{{ contact.telephone }}</span>
                      </div>
                      <div v-if="!contact.email && !contact.telephone" class="text-gray-400 italic">
                        Non renseigné
                      </div>
                    </div>
                  </td>

                  <!-- Description -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {{ contact.description || '—' }}
                  </td>

                  <!-- Created At -->
                  <td class="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {{ new Date(contact.createdAt).toLocaleDateString('fr-FR') }}
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        @click="openContactChallengesModal(contact)"
                        class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 dark:text-indigo-300 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Voir la liste concise des défis de ce contact"
                      >
                        <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5" />
                        <span>Défis ({{ challenges.filter(c => c.contactId === contact.id).length }})</span>
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
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
            <span>Ajouter un défi accompli</span>
          </button>
        </div>

        <!-- Finished Challenges Table -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Défi & Contact</th>
                  <th class="px-5 py-3.5">Type & Rang</th>
                  <th class="px-5 py-3.5">Bilan / Réflexion</th>
                  <th class="px-5 py-3.5">Date d'accomplissement</th>
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
                  <!-- Text & Contact -->
                  <td class="px-5 py-4 max-w-sm">
                    <div class="font-bold text-gray-900 dark:text-white leading-snug">
                      {{ challenge.text }}
                    </div>
                    <div class="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
                      <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
                      <span>{{ challenge.contact?.name || 'Contact inconnu' }}</span>
                    </div>
                  </td>

                  <!-- Type & Rank -->
                  <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        :class="challenge.type === 'written'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'"
                      >
                        {{ challenge.type === 'written' ? '✍️ Écrit' : '🗣️ Oral' }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-md text-xs font-bold font-mono"
                        :class="getRankBadgeClass(challenge.rank ?? 2.5)"
                      >
                        {{ Number(challenge.rank ?? 2.5).toFixed(1) }}
                      </span>
                    </div>
                  </td>

                  <!-- Notes -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs">
                    <p v-if="challenge.afterChallengeNotes" class="line-clamp-2 italic">
                      « {{ challenge.afterChallengeNotes }} »
                    </p>
                    <span v-else class="text-gray-400 italic">Aucun bilan</span>
                  </td>

                  <!-- Completed Date -->
                  <td class="px-5 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-medium">
                    {{ challenge.completedAt ? new Date(challenge.completedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—' }}
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
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
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Défis en attente d'accomplissement, ordonnés par rang de priorité décroissant.
          </p>
          <button
            @click="openCreateChallengeModal(undefined, false)"
            class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs cursor-pointer"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
            <span>Nouveau défi à faire</span>
          </button>
        </div>

        <!-- Todo Table -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50 dark:bg-gray-900/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-5 py-3.5">Rang</th>
                  <th class="px-5 py-3.5">Défi</th>
                  <th class="px-5 py-3.5">Contact</th>
                  <th class="px-5 py-3.5">Type</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                <tr v-if="sortedTodoChallenges.length === 0">
                  <td colspan="5" class="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucun défi à faire dans la réserve. Crée un nouveau défi pour commencer !
                  </td>
                </tr>
                <tr
                  v-for="challenge in sortedTodoChallenges"
                  :key="challenge.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <!-- Rank -->
                  <td class="px-5 py-4 whitespace-nowrap">
                    <span
                      class="px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-xs"
                      :class="getRankBadgeClass(challenge.rank ?? 2.5)"
                    >
                      {{ Number(challenge.rank ?? 2.5).toFixed(1) }}
                    </span>
                  </td>

                  <!-- Text -->
                  <td class="px-5 py-4 font-bold text-gray-900 dark:text-white max-w-md">
                    {{ challenge.text }}
                  </td>

                  <!-- Contact -->
                  <td class="px-5 py-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {{ challenge.contact?.name || '—' }}
                  </td>

                  <!-- Type -->
                  <td class="px-5 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      :class="challenge.type === 'written'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'"
                    >
                      {{ challenge.type === 'written' ? '✍️ Écrit' : '🗣️ Oral' }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openReflectModal(challenge)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Marquer comme accompli et rédiger un bilan"
                      >
                        <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
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
              <h3 class="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                {{ activeContactForChallenges?.name }}
              </h3>
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
                Défis associés (par date de complétion croissante) :
              </h4>
              <button
                @click="openCreateChallengeModal(activeContactForChallenges?.id)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                <span>Nouveau défi pour ce contact</span>
              </button>
            </div>

            <div v-if="activeContactChallenges.length === 0" class="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl">
              Aucun défi associé à ce contact pour l'instant.
            </div>

            <div v-else class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="ch in activeContactChallenges"
                :key="ch.id"
                class="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/60 flex items-start justify-between gap-3 text-xs"
              >
                <div class="space-y-1 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-indigo-600 dark:text-indigo-400">
                      {{ ch.type === 'written' ? '✍️ Écrit' : '🗣️ Oral' }}
                    </span>
                    <span class="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded" :class="getRankBadgeClass(ch.rank ?? 2.5)">
                      #{{ Number(ch.rank ?? 2.5).toFixed(1) }}
                    </span>
                    <span v-if="ch.completedAt" class="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Terminé le {{ new Date(ch.completedAt).toLocaleDateString('fr-FR') }}
                    </span>
                    <span v-else class="text-amber-600 dark:text-amber-400 font-semibold">
                      ⏳ À faire
                    </span>
                  </div>
                  <p class="font-bold text-gray-900 dark:text-white">{{ ch.text }}</p>
                  <p v-if="ch.afterChallengeNotes" class="text-gray-600 dark:text-gray-300 italic">
                    « {{ ch.afterChallengeNotes }} »
                  </p>
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
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="isContactChallengesModalOpen = false"
              class="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
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
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option v-for="c in contacts" :key="c.id" :value="c.id">
                  {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                </option>
              </select>
            </div>

            <!-- Challenge Action Text -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Action du défi *
                </label>
                <span class="text-xs" :class="challengeForm.text.length > 255 ? 'text-red-500 font-bold' : 'text-gray-400'">
                  {{ challengeForm.text.length }} / 255
                </span>
              </div>
              <input
                v-model="challengeForm.text"
                type="text"
                maxlength="255"
                placeholder="Ex: Demander par mail les horaires d'ouverture du samedi"
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <!-- Type Selector -->
            <div class="grid grid-cols-2 gap-3">
              <label
                class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
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
                class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
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

            <!-- Rank Slider: 0 (Red) to 5 (Green) -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2">
              <div class="flex justify-between items-center">
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Rang de priorité (0.0 à 5.0)
                </label>
                <span
                  class="text-xs font-black font-mono px-2 py-0.5 rounded shadow-xs"
                  :class="getRankBadgeClass(challengeForm.rank)"
                >
                  {{ Number(challengeForm.rank).toFixed(1) }} / 5.0
                </span>
              </div>

              <!-- Range Slider -->
              <input
                v-model.number="challengeForm.rank"
                type="range"
                min="0"
                max="5"
                step="0.1"
                class="w-full h-2 rounded-lg cursor-pointer appearance-none bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
              />
              <div class="flex justify-between text-[10px] font-bold text-gray-400">
                <span class="text-red-500">0.0 (Faible)</span>
                <span class="text-amber-500">2.5 (Moyen)</span>
                <span class="text-emerald-500">5.0 (Prioritaire)</span>
              </div>
            </div>

            <!-- Completion toggle & fields (CRUD complet pour les défis terminés) -->
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
                  <input
                    v-model="challengeForm.completedAt"
                    type="datetime-local"
                    class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Bilan / Réflexions après le défi
                  </label>
                  <textarea
                    v-model="challengeForm.afterChallengeNotes"
                    rows="3"
                    placeholder="Notes, points d'apprentissage, bilan..."
                    class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                @click="isChallengeModalOpen = false"
                class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="challengeSubmitting"
                class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
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
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {{ selectedChallengeForReflect?.type === 'written' ? 'Défi écrit' : 'Défi oral' }}
                </span>
                <span class="text-xs text-gray-400">avec</span>
                <span class="text-sm font-bold text-gray-900 dark:text-white">
                  {{ selectedChallengeForReflect?.contact?.name }}
                </span>
              </div>
              <h3 class="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
                Terminer & Réfléchir
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                « {{ selectedChallengeForReflect?.text }} »
              </p>
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
              <input
                v-model="reflectCompletedAt"
                type="datetime-local"
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Bilan de l'interaction & réflexions
              </label>
              <textarea
                v-model="reflectNotes"
                rows="5"
                placeholder="Décris comment s'est passé l'échange, tes ressentis, tes progrès..."
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                @click="isReflectModalOpen = false"
                class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="reflectSubmitting"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <UIcon v-if="reflectSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                <span>Enregistrer le bilan</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
