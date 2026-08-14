<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({
  title: 'Défis & Contacts - Dijon 26',
  meta: [
    { name: 'description', content: 'Gère tes défis quotidiens et ton réseau de contacts à Dijon' },
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
  scheduledFor: string | null
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
const activeTab = ref<'today' | 'tomorrow' | 'all'>('today')

// Modals
const isReflectModalOpen = ref(false)
const selectedChallengeForReflect = ref<Challenge | null>(null)
const reflectNotes = ref('')
const reflectCompletedAt = ref('')
const reflectSubmitting = ref(false)

const isContactModalOpen = ref(false)
const selectedContact = ref<Contact | null>(null)

const isNewChallengeModalOpen = ref(false)
const newChallengeForm = ref({
  contactMode: 'existing' as 'existing' | 'new',
  contactId: '',
  newContactName: '',
  newContactEmail: '',
  newContactPhone: '',
  newContactDescription: '',
  text: '',
  type: 'written' as 'written' | 'spoken',
  scheduledDateOption: 'today' as 'today' | 'tomorrow' | 'custom',
  customDate: '',
})
const newChallengeSubmitting = ref(false)

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
const tomorrowStr = computed(() => {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return getLocalDateString(t)
})

// Challenges filtered by date
const todayCompletedChallenges = computed(() => {
  return challenges.value.filter((c) => {
    if (!c.completedAt) return false
    return getLocalDateString(c.completedAt) === todayStr.value
  })
})

const todayPendingChallenges = computed(() => {
  return challenges.value.filter((c) => {
    if (c.completedAt) return false
    if (!c.scheduledFor) return true // backlog defaults to today
    return getLocalDateString(c.scheduledFor) === todayStr.value
  })
})

const tomorrowPendingChallenges = computed(() => {
  return challenges.value.filter((c) => {
    if (c.completedAt) return false
    if (!c.scheduledFor) return false
    return getLocalDateString(c.scheduledFor) === tomorrowStr.value
  })
})

// Calculations for alerts
const todayDoneCount = computed(() => todayCompletedChallenges.value.length)
const todayPendingCount = computed(() => todayPendingChallenges.value.length)
const todayTotalAvailable = computed(() => todayDoneCount.value + todayPendingCount.value)
const todayMissingCount = computed(() => {
  const missing = dailyTarget.value - todayTotalAvailable.value
  return missing > 0 ? missing : 0
})

const tomorrowPendingCount = computed(() => tomorrowPendingChallenges.value.length)
const tomorrowMissingCount = computed(() => {
  const missing = dailyTarget.value - tomorrowPendingCount.value
  return missing > 0 ? missing : 0
})

// Displayed challenges depending on tab
const displayedChallenges = computed(() => {
  if (activeTab.value === 'today') {
    return [
      ...todayPendingChallenges.value,
      ...todayCompletedChallenges.value,
    ]
  }
  if (activeTab.value === 'tomorrow') {
    return challenges.value.filter((c) => {
      if (!c.scheduledFor) return false
      return getLocalDateString(c.scheduledFor) === tomorrowStr.value
    })
  }
  return challenges.value
})

// Update Daily Target
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

// Open Reflect Modal
const openReflectModal = (challenge: Challenge) => {
  selectedChallengeForReflect.value = challenge
  reflectNotes.value = challenge.afterChallengeNotes || ''
  
  // Format current local datetime for datetime-local input
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  reflectCompletedAt.value = `${year}-${month}-${day}T${hours}:${minutes}`
  
  isReflectModalOpen.value = true
}

// Submit Challenge Reflection
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

// Delete Challenge
const deleteChallenge = async (id: string) => {
  if (!confirm('Es-tu sûr(e) de vouloir supprimer ce défi ?')) return
  try {
    await $fetch(`/api/challenges/${id}`, { method: 'DELETE' })
    await fetchData()
  } catch (err) {
    console.error('Erreur lors de la suppression du défi:', err)
  }
}

// Open Contact Details Modal
const openContactModal = (contactId: string) => {
  const found = contacts.value.find((c) => c.id === contactId)
  if (found) {
    selectedContact.value = found
    isContactModalOpen.value = true
  }
}

// Filter Contact challenges for history
const selectedContactChallenges = computed(() => {
  if (!selectedContact.value) return []
  return challenges.value.filter((c) => c.contactId === selectedContact.value?.id)
})

// Reflect Contact Previous Challenges (for the reflect modal)
const reflectContactHistory = computed(() => {
  if (!selectedChallengeForReflect.value) return []
  const cId = selectedChallengeForReflect.value.contactId
  return challenges.value.filter(
    (c) => c.contactId === cId && c.id !== selectedChallengeForReflect.value?.id && c.completedAt
  )
})

// Create Challenge
const openCreateChallengeModal = (defaultTabDate?: 'today' | 'tomorrow') => {
  newChallengeForm.value = {
    contactMode: contacts.value.length > 0 ? 'existing' : 'new',
    contactId: contacts.value[0]?.id || '',
    newContactName: '',
    newContactEmail: '',
    newContactPhone: '',
    newContactDescription: '',
    text: '',
    type: 'written',
    scheduledDateOption: defaultTabDate || (activeTab.value === 'tomorrow' ? 'tomorrow' : 'today'),
    customDate: todayStr.value,
  }
  isNewChallengeModalOpen.value = true
}

const submitNewChallenge = async () => {
  if (!newChallengeForm.value.text.trim()) return
  newChallengeSubmitting.value = true
  try {
    let targetDate = todayStr.value
    if (newChallengeForm.value.scheduledDateOption === 'tomorrow') {
      targetDate = tomorrowStr.value
    } else if (newChallengeForm.value.scheduledDateOption === 'custom' && newChallengeForm.value.customDate) {
      targetDate = newChallengeForm.value.customDate
    }

    const payload: any = {
      text: newChallengeForm.value.text.trim(),
      type: newChallengeForm.value.type,
      scheduledFor: new Date(`${targetDate}T10:00:00.000Z`).toISOString(),
    }

    if (newChallengeForm.value.contactMode === 'existing') {
      payload.contactId = newChallengeForm.value.contactId
    } else {
      payload.newContactName = newChallengeForm.value.newContactName.trim()
      payload.newContactEmail = newChallengeForm.value.newContactEmail.trim() || undefined
      payload.newContactPhone = newChallengeForm.value.newContactPhone.trim() || undefined
      payload.newContactDescription = newChallengeForm.value.newContactDescription.trim() || undefined
    }

    const res = await $fetch<{ success: boolean; data: Challenge }>('/api/challenges', {
      method: 'POST',
      body: payload,
    })

    if (res.success) {
      isNewChallengeModalOpen.value = false
      await fetchData()
    }
  } catch (err) {
    console.error('Erreur lors de la création du défi:', err)
  } finally {
    newChallengeSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8 pb-12">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold">
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Défis & Réseau
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Définis, accomplis et analyse tes interactions quotidiennes à Dijon.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openCreateChallengeModal()"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <UIcon name="i-heroicons-plus" class="w-5 h-5" />
          <span>Nouveau défi</span>
        </button>
      </div>
    </div>

    <!-- Dashboard & Goal Tracker -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Goal Config & Main Progress Card -->
      <div class="md:col-span-2 bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/60 shadow-sm space-y-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-flag" class="w-5 h-5 text-indigo-500" />
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Objectif quotidien
            </span>
          </div>

          <!-- Target Edit -->
          <div class="flex items-center gap-2">
            <div v-if="!isEditingTarget" class="flex items-center gap-2">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {{ dailyTarget }} défis / jour
              </span>
              <button
                @click="isEditingTarget = true"
                class="p-1 rounded-md text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Modifier l'objectif"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
              </button>
            </div>
            <div v-else class="flex items-center gap-2">
              <input
                v-model.number="targetInput"
                type="number"
                min="1"
                max="100"
                class="w-16 px-2 py-1 text-sm border rounded-lg border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
              <button
                @click="saveDailyTarget"
                class="px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                OK
              </button>
              <button
                @click="isEditingTarget = false"
                class="px-2.5 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>

        <!-- Progress bar & counts -->
        <div class="space-y-2">
          <div class="flex justify-between items-baseline">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-gray-900 dark:text-white">
                {{ todayDoneCount }}
              </span>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                / {{ dailyTarget }} complétés aujourd'hui
              </span>
            </div>
            <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {{ Math.round((todayDoneCount / (dailyTarget || 1)) * 100) }}%
            </span>
          </div>

          <div class="w-full bg-gray-100 dark:bg-gray-700 h-3.5 rounded-full overflow-hidden">
            <div
              class="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${Math.min(100, Math.round((todayDoneCount / (dailyTarget || 1)) * 100))}%` }"
            />
          </div>
        </div>

        <!-- Dynamic Warning Alerts for Today -->
        <div
          v-if="todayMissingCount > 0"
          class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3.5"
        >
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-bold text-amber-900 dark:text-amber-200">
              Il te manque {{ todayMissingCount }} défi{{ todayMissingCount > 1 ? 's' : '' }} pour atteindre ton objectif aujourd'hui !
            </p>
            <p class="text-amber-700 dark:text-amber-400 mt-0.5">
              Tu as réalisé {{ todayDoneCount }} défi{{ todayDoneCount > 1 ? 's' : '' }} et il t'en reste {{ todayPendingCount }} prévu{{ todayPendingCount > 1 ? 's' : '' }} aujourd'hui.
            </p>
            <button
              @click="openCreateChallengeModal('today')"
              class="mt-2 text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline cursor-pointer"
            >
              + Ajouter un défi pour aujourd'hui
            </button>
          </div>
        </div>

        <div
          v-else
          class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3.5"
        >
          <UIcon name="i-heroicons-check-badge" class="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Félicitations ! Tu as suffisamment de défis planifiés ou complétés pour remplir ton objectif de {{ dailyTarget }} aujourd'hui.
          </p>
        </div>
      </div>

      <!-- Preparation Card for Tomorrow -->
      <div class="bg-white dark:bg-gray-800/90 rounded-2xl p-6 border border-gray-200/80 dark:border-gray-700/60 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-sky-500" />
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Préparation de demain
            </span>
          </div>

          <div class="mt-4">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-gray-900 dark:text-white">
                {{ tomorrowPendingCount }}
              </span>
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                / {{ dailyTarget }} programmés
              </span>
            </div>

            <div class="mt-3">
              <div v-if="tomorrowMissingCount > 0" class="text-xs text-sky-800 dark:text-sky-300 font-medium bg-sky-50 dark:bg-sky-950/40 p-3 rounded-lg border border-sky-100 dark:border-sky-900/40">
                Il t'en manque <strong>{{ tomorrowMissingCount }}</strong> pour être totalement prêt demain.
              </div>
              <div v-else class="text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                Objectif de demain déjà atteint en préparation !
              </div>
            </div>
          </div>
        </div>

        <button
          @click="openCreateChallengeModal('tomorrow')"
          class="w-full py-2.5 px-4 rounded-xl border border-dashed border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-bold transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
        >
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
          <span>Planifier un défi pour demain</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
      <div class="flex space-x-2 sm:space-x-4">
        <button
          @click="activeTab = 'today'"
          class="py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'today'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <span>Aujourd'hui</span>
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {{ todayPendingChallenges.length + todayCompletedChallenges.length }}
          </span>
        </button>

        <button
          @click="activeTab = 'tomorrow'"
          class="py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'tomorrow'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <span>Demain</span>
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {{ tomorrowPendingCount }}
          </span>
        </button>

        <button
          @click="activeTab = 'all'"
          class="py-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2"
          :class="activeTab === 'all'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <span>Tous / Historique</span>
          <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {{ challenges.length }}
          </span>
        </button>
      </div>

      <div class="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
        {{ contacts.length }} contact{{ contacts.length > 1 ? 's' : '' }} référencé{{ contacts.length > 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Challenges List -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
      <p>Chargement des défis...</p>
    </div>

    <div v-else-if="displayedChallenges.length === 0" class="text-center py-12 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 space-y-4">
      <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400">
        <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-base font-bold text-gray-900 dark:text-white">Aucun défi dans cette vue</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Planifie tes prochaines prises de contact pour booster ton réseau à Dijon.
        </p>
      </div>
      <button
        @click="openCreateChallengeModal()"
        class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
      >
        <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        <span>Créer un défi</span>
      </button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="challenge in displayedChallenges"
        :key="challenge.id"
        class="bg-white dark:bg-gray-800 rounded-xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md"
        :class="challenge.completedAt
          ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/10 dark:bg-emerald-950/10'
          : 'border-gray-200 dark:border-gray-700/80'"
      >
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <!-- Left Content -->
          <div class="space-y-2 flex-1">
            <!-- Contact & Badges Row -->
            <div class="flex flex-wrap items-center gap-2">
              <button
                @click="openContactModal(challenge.contactId)"
                class="font-bold text-sm text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UIcon name="i-heroicons-building-library" class="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{{ challenge.contact?.name || 'Contact inconnu' }}</span>
              </button>

              <!-- Type Badge -->
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1"
                :class="challenge.type === 'written'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50'"
              >
                <span>{{ challenge.type === 'written' ? '✍️ Écrit' : '🗣️ Oral' }}</span>
              </span>

              <!-- Status Badge -->
              <span
                v-if="challenge.completedAt"
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 inline-flex items-center gap-1"
              >
                <UIcon name="i-heroicons-check" class="w-3.5 h-3.5" />
                <span>Accompli</span>
              </span>
            </div>

            <!-- Challenge Text -->
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">
              {{ challenge.text }}
            </p>

            <!-- After notes preview if completed -->
            <div
              v-if="challenge.afterChallengeNotes"
              class="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 space-y-1"
            >
              <div class="flex items-center gap-1.5 font-bold text-gray-500 dark:text-gray-400">
                <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-3.5 h-3.5" />
                <span>Récapituler et réfléchir :</span>
              </div>
              <p class="whitespace-pre-wrap leading-relaxed">
                {{ challenge.afterChallengeNotes }}
              </p>
            </div>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700">
            <button
              @click="openReflectModal(challenge)"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              :class="challenge.completedAt
                ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
            >
              <UIcon :name="challenge.completedAt ? 'i-heroicons-pencil-square' : 'i-heroicons-check-circle'" class="w-4 h-4" />
              <span>{{ challenge.completedAt ? 'Modifier bilan' : 'Terminer & Réfléchir' }}</span>
            </button>

            <div class="flex items-center gap-1">
              <button
                @click="openContactModal(challenge.contactId)"
                class="p-2 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Voir la fiche contact et l'historique"
              >
                <UIcon name="i-heroicons-eye" class="w-4 h-4" />
              </button>
              <button
                @click="deleteChallenge(challenge.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Supprimer le défi"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal : Récapituler et Réfléchir -->
    <div
      v-if="isReflectModalOpen && selectedChallengeForReflect"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="isReflectModalOpen = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {{ selectedChallengeForReflect.type === 'written' ? 'Défi écrit' : 'Défi oral' }}
              </span>
              <span class="text-xs text-gray-400">avec</span>
              <span class="text-sm font-bold text-gray-900 dark:text-white">
                {{ selectedChallengeForReflect.contact?.name }}
              </span>
            </div>
            <h2 class="text-xl font-extrabold text-gray-900 dark:text-white mt-1">
              Récapituler et réfléchir
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Défi : « {{ selectedChallengeForReflect.text }} »
            </p>
          </div>
          <button
            @click="isReflectModalOpen = false"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="submitReflection" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Date & heure d'accomplissement
            </label>
            <input
              v-model="reflectCompletedAt"
              type="datetime-local"
              required
              class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              {{ selectedChallengeForReflect.type === 'written' ? 'Texte de l’e-mail / Échange écrit & analyse' : 'Débriefing de l’interaction orale' }}
            </label>
            <p class="text-xs text-gray-400 dark:text-gray-500 mb-2">
              {{ selectedChallengeForReflect.type === 'written'
                ? 'Copie ici le message envoyé, note les éventuelles difficultés, incompréhensions ou points d’amélioration.'
                : 'Décris comment s’est passé l’échange, ce qui a bien fonctionné, ce qui a coincé et ce que tu as appris.' }}
            </p>
            <textarea
              v-model="reflectNotes"
              rows="6"
              placeholder="Écris ton bilan et tes réflexions ici..."
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Contact Previous History preview -->
          <div v-if="reflectContactHistory.length > 0" class="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Historique des défis précédents avec {{ selectedChallengeForReflect.contact?.name }}
            </h4>
            <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
              <div
                v-for="prev in reflectContactHistory"
                :key="prev.id"
                class="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1"
              >
                <div class="flex items-center justify-between text-gray-400">
                  <span class="font-medium">{{ prev.type === 'written' ? '✍️ Écrit' : '🗣️ Oral' }}</span>
                  <span>{{ prev.completedAt ? new Date(prev.completedAt).toLocaleDateString('fr-FR') : '' }}</span>
                </div>
                <p class="font-semibold text-gray-800 dark:text-gray-200">{{ prev.text }}</p>
                <p v-if="prev.afterChallengeNotes" class="text-gray-600 dark:text-gray-400 italic">
                  « {{ prev.afterChallengeNotes }} »
                </p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              @click="isReflectModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="reflectSubmitting"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              <UIcon v-if="reflectSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <span>Valider le bilan</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal : Fiche Contact & Historique -->
    <div
      v-if="isContactModalOpen && selectedContact"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="isContactModalOpen = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <!-- Contact Header -->
        <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xl">
              {{ selectedContact.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2 class="text-xl font-extrabold text-gray-900 dark:text-white">
                {{ selectedContact.name }}
              </h2>
              <p class="text-xs text-gray-400">
                Fiche contact & historique des échanges
              </p>
            </div>
          </div>
          <button
            @click="isContactModalOpen = false"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Contact details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">E-mail</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ selectedContact.email || 'Non renseigné' }}</span>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">Téléphone</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ selectedContact.telephone || 'Non renseigné' }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400 block">Description / Rôle</span>
            <span class="text-gray-700 dark:text-gray-300">{{ selectedContact.description || 'Aucune description disponible' }}</span>
          </div>
        </div>

        <!-- Contact Challenge History -->
        <div class="space-y-3">
          <h3 class="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-4 h-4 text-indigo-500" />
            <span>Historique des défis avec ce contact ({{ selectedContactChallenges.length }})</span>
          </h3>

          <div v-if="selectedContactChallenges.length === 0" class="text-xs text-gray-400 py-4 text-center">
            Aucun défi pour ce contact pour le moment.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="ch in selectedContactChallenges"
              :key="ch.id"
              class="p-4 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-900 text-sm space-y-2"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-indigo-600 dark:text-indigo-400">
                  {{ ch.type === 'written' ? '✍️ Échange écrit' : '🗣️ Échange oral' }}
                </span>
                <span class="text-gray-400">
                  {{ ch.completedAt ? `Accompli le ${new Date(ch.completedAt).toLocaleDateString('fr-FR')}` : 'En attente' }}
                </span>
              </div>
              <p class="font-bold text-gray-900 dark:text-white">{{ ch.text }}</p>
              <div v-if="ch.afterChallengeNotes" class="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                <span class="font-bold block text-gray-500 dark:text-gray-400 mb-0.5">Bilan / Réflexion :</span>
                {{ ch.afterChallengeNotes }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            @click="isContactModalOpen = false"
            class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal : Nouveau Défi -->
    <div
      v-if="isNewChallengeModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      @click.self="isNewChallengeModalOpen = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div class="flex items-start justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
          <div>
            <h2 class="text-xl font-extrabold text-gray-900 dark:text-white">
              Créer un nouveau défi
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Associe une action à un contact et programme sa réalisation.
            </p>
          </div>
          <button
            @click="isNewChallengeModalOpen = false"
            class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="submitNewChallenge" class="space-y-4">
          <!-- Contact Selection Mode -->
          <div class="space-y-2">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Contact associé
            </label>

            <div class="flex gap-4 mb-2">
              <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  v-model="newChallengeForm.contactMode"
                  type="radio"
                  value="existing"
                  :disabled="contacts.length === 0"
                />
                <span>Choisir un contact existant ({{ contacts.length }})</span>
              </label>
              <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  v-model="newChallengeForm.contactMode"
                  type="radio"
                  value="new"
                />
                <span>Nouveau contact</span>
              </label>
            </div>

            <div v-if="newChallengeForm.contactMode === 'existing' && contacts.length > 0">
              <select
                v-model="newChallengeForm.contactId"
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option v-for="c in contacts" :key="c.id" :value="c.id">
                  {{ c.name }} {{ c.email ? `(${c.email})` : '' }}
                </option>
              </select>
            </div>

            <div v-else class="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <input
                v-model="newChallengeForm.newContactName"
                type="text"
                placeholder="Nom du contact (personne, musée, club...)"
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              />
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="newChallengeForm.newContactEmail"
                  type="email"
                  placeholder="E-mail (optionnel)"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                />
                <input
                  v-model="newChallengeForm.newContactPhone"
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
                />
              </div>
              <input
                v-model="newChallengeForm.newContactDescription"
                type="text"
                placeholder="Description courte / adresse (optionnel)"
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <!-- Challenge Text -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Action du défi (court)
              </label>
              <span class="text-xs" :class="newChallengeForm.text.length > 255 ? 'text-red-500 font-bold' : 'text-gray-400'">
                {{ newChallengeForm.text.length }} / 255
              </span>
            </div>
            <input
              v-model="newChallengeForm.text"
              type="text"
              maxlength="255"
              placeholder="Ex: Écrire au musée pour demander les visites guidées de septembre"
              required
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Challenge Type -->
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
              :class="newChallengeForm.type === 'written'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
            >
              <input
                v-model="newChallengeForm.type"
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
              :class="newChallengeForm.type === 'spoken'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
            >
              <input
                v-model="newChallengeForm.type"
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

          <!-- Scheduled For -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Planifié pour
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="newChallengeForm.scheduledDateOption = 'today'"
                class="py-2 text-xs font-semibold rounded-lg border transition-all"
                :class="newChallengeForm.scheduledDateOption === 'today'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                @click="newChallengeForm.scheduledDateOption = 'tomorrow'"
                class="py-2 text-xs font-semibold rounded-lg border transition-all"
                :class="newChallengeForm.scheduledDateOption === 'tomorrow'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                Demain
              </button>
              <button
                type="button"
                @click="newChallengeForm.scheduledDateOption = 'custom'"
                class="py-2 text-xs font-semibold rounded-lg border transition-all"
                :class="newChallengeForm.scheduledDateOption === 'custom'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'"
              >
                Autre date
              </button>
            </div>

            <div v-if="newChallengeForm.scheduledDateOption === 'custom'" class="mt-2">
              <input
                v-model="newChallengeForm.customDate"
                type="date"
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white dark:bg-gray-900"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              @click="isNewChallengeModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="newChallengeSubmitting"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              <UIcon v-if="newChallengeSubmitting" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <span>Créer le défi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
