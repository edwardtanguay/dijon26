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
    subtitle: 'Entre ton code PIN à 3 chiffres pour déverrouiller l\'accès.'
  }
)

const emit = defineEmits<{
  (e: 'success'): void
}>()

const enteredDigits = ref('')
const isError = ref(false)
const isSuccess = ref(false)
const errorMessage = ref('')

const addDigit = (digit: string) => {
  if (isError.value || isSuccess.value || enteredDigits.value.length >= 3) return

  enteredDigits.value += digit

  if (enteredDigits.value.length === 3) {
    if (enteredDigits.value === props.pin) {
      isSuccess.value = true
      errorMessage.value = ''
      setTimeout(() => {
        emit('success')
      }, 250)
    } else {
      isError.value = true
      errorMessage.value = 'Code PIN incorrect'
      setTimeout(() => {
        enteredDigits.value = ''
        isError.value = false
        errorMessage.value = ''
      }, 800)
    }
  }
}

const removeDigit = () => {
  if (isError.value || isSuccess.value) return
  if (enteredDigits.value.length > 0) {
    enteredDigits.value = enteredDigits.value.slice(0, -1)
  }
}

const clearDigits = () => {
  if (isError.value || isSuccess.value) return
  enteredDigits.value = ''
  errorMessage.value = ''
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
          isSuccess ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' :
          isError ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400' :
          'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
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
      <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-5">
        {{ subtitle }}
      </p>

      <!-- Pastilles indicatrices du PIN (3 chiffres) -->
      <div
        class="flex items-center gap-3.5 mb-6 transition-transform"
        :class="{ 'animate-shake': isError }"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="w-4 h-4 rounded-full transition-all duration-200 border"
          :class="[
            isError
              ? 'bg-red-500 border-red-500 shadow-sm shadow-red-500/50'
              : isSuccess
                ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/50'
                : enteredDigits.length >= index
                  ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 scale-110 shadow-sm shadow-indigo-500/40'
                  : 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
          ]"
        />
      </div>

      <!-- Message d'erreur -->
      <div class="h-5 mb-2 flex items-center justify-center">
        <span
          v-if="errorMessage"
          class="text-xs font-medium text-red-500 dark:text-red-400 transition-opacity"
        >
          {{ errorMessage }}
        </span>
      </div>

      <!-- Clavier numérique 3x4 -->
      <div class="grid grid-cols-3 gap-3 w-full">
        <!-- Chiffres 1 à 9 -->
        <button
          v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="num"
          type="button"
          @click="addDigit(num)"
          class="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 dark:active:bg-gray-650 text-gray-900 dark:text-white font-semibold text-xl transition-all duration-150 flex items-center justify-center shadow-xs select-none active:scale-95 cursor-pointer"
        >
          {{ num }}
        </button>

        <!-- Touche Effacer tout (C) -->
        <button
          type="button"
          @click="clearDigits"
          class="h-13 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-650 font-medium text-sm transition-all duration-150 flex items-center justify-center select-none active:scale-95 cursor-pointer"
          title="Tout effacer (Échap)"
        >
          C
        </button>

        <!-- Touche 0 -->
        <button
          type="button"
          @click="addDigit('0')"
          class="h-13 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 dark:active:bg-gray-650 text-gray-900 dark:text-white font-semibold text-xl transition-all duration-150 flex items-center justify-center shadow-xs select-none active:scale-95 cursor-pointer"
        >
          0
        </button>

        <!-- Touche Retour arrière (⌫) -->
        <button
          type="button"
          @click="removeDigit"
          class="h-13 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-650 transition-all duration-150 flex items-center justify-center select-none active:scale-95 cursor-pointer"
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

<style scoped>
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-6px);
  }
  40%, 80% {
    transform: translateX(6px);
  }
}

.animate-shake {
  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
</style>
