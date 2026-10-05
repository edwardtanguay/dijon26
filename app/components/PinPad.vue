<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    pin?: string
    title?: string
    subtitle?: string
  }>(),
  {
    pin: '515',
    title: 'Notes protégées',
    subtitle: 'Entre ton code PIN pour déverrouiller l\'accès.'
  }
)

const emit = defineEmits<{
  (e: 'success'): void
}>()

const enteredDigits = ref('')
const isSuccess = ref(false)

const addDigit = (digit: string) => {
  if (isSuccess.value) return

  enteredDigits.value = (enteredDigits.value + digit).slice(-20)

  if (enteredDigits.value.endsWith(props.pin)) {
    isSuccess.value = true
    setTimeout(() => {
      emit('success')
    }, 250)
  }
}

const removeDigit = () => {
  if (isSuccess.value) return
  if (enteredDigits.value.length > 0) {
    enteredDigits.value = enteredDigits.value.slice(0, -1)
  }
}

const clearDigits = () => {
  if (isSuccess.value) return
  enteredDigits.value = ''
}

const handleKeyDown = (e: KeyboardEvent) => {
  // Ignorer si l'utilisateur saisit dans un champ de texte
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.key >= '0' && e.key <= '9') {
    e.preventDefault()
    addDigit(e.key)
  } else if (e.key === 'Backspace') {
    e.preventDefault()
    removeDigit()
  } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
    e.preventDefault()
    clearDigits()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-xs sm:max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700/60 p-6 flex flex-col items-center transition-all duration-300">
      
      <!-- Cadenas / En-tête -->
      <div
        class="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors duration-200"
        :class="[
          isSuccess
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
        ]"
      >
        <!-- Cadenas ouvert lors du succès -->
        <svg v-if="isSuccess" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 12.75v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <!-- Cadenas fermé par défaut -->
        <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      <h2 class="text-xl font-bold text-gray-900 dark:text-white text-center">
        {{ title }}
      </h2>
      <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-6">
        {{ subtitle }}
      </p>

      <!-- Clavier numérique 3x4 -->
      <div class="grid grid-cols-3 gap-3 w-full">
        <!-- Chiffres 1 à 9 -->
        <button
          v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="num"
          type="button"
          @click="addDigit(num)"
          class="h-13 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold text-xl transition-all duration-150 flex items-center justify-center shadow-xs select-none active:scale-95 cursor-pointer"
        >
          {{ num }}
        </button>

        <!-- Touche Effacer tout (C) -->
        <button
          type="button"
          @click="clearDigits"
          class="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center select-none active:scale-95 cursor-pointer"
          title="Tout effacer (Échap)"
        >
          C
        </button>

        <!-- Touche 0 -->
        <button
          type="button"
          @click="addDigit('0')"
          class="h-13 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold text-xl transition-all duration-150 flex items-center justify-center shadow-xs select-none active:scale-95 cursor-pointer"
        >
          0
        </button>

        <!-- Touche Retour arrière (⌫) -->
        <button
          type="button"
          @click="removeDigit"
          class="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-650 border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-all duration-150 flex items-center justify-center select-none active:scale-95 cursor-pointer"
          title="Effacer le dernier chiffre (Retour arrière)"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.21-.21.496-.33.795-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.285c-.299 0-.585-.12-.795-.33z" />
          </svg>
        </button>
      </div>

    </div>
  </div>
</template>
