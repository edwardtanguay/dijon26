<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const mobileMenuOpen = ref(false)
const navRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (mobileMenuOpen.value && navRef.value && !navRef.value.contains(event.target as Node)) {
    mobileMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const navItems = [
  { name: 'Accueil', path: '/', icon: 'i-heroicons-home' },
  { name: 'Notes', path: '/notes', icon: 'i-heroicons-list-bullet' },
  { name: 'Turso', path: '/turso', icon: 'i-heroicons-circle-stack' },
  { name: 'À propos', path: '/about', icon: 'i-heroicons-document-text' },
]
</script>

<template>
  <nav ref="navRef"
       class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
    <div class="container-custom">
      <div class="flex justify-between items-center h-16" @click="mobileMenuOpen = false">
        <!-- Logo / Brand -->
        <NuxtLink to="/" @click="mobileMenuOpen = false" class="group block">
          <div class="flex flex-row items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shrink-0 text-base shadow-sm group-hover:bg-indigo-500 transition-colors">
              D
            </div>
            <span class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors whitespace-nowrap">
              Dijon 26
            </span>
          </div>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <NuxtLink v-for="item in navItems"
                    :key="item.path"
                    :to="item.path"
                    class="flex items-center space-x-2 !text-gray-600 hover:!text-black transition-colors font-medium dark:!text-gray-300 dark:hover:!text-white"
                    active-class="!text-black dark:!text-white font-semibold">
            <UIcon :name="item.icon" class="h-5 w-5" />
            <span>{{ item.name }}</span>
          </NuxtLink>

          <!-- Desktop Color Mode Toggle -->
          <button @click="toggleColorMode"
                  class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                  aria-label="Toggle dark mode">
            <UIcon v-if="colorMode.value === 'dark'" name="i-heroicons-sun" class="h-5 w-5" />
            <UIcon v-else name="i-heroicons-moon" class="h-5 w-5" />
          </button>
        </div>

        <div class="flex items-center space-x-2 md:hidden">
          <!-- Mobile Color Mode Toggle -->
          <button @click.stop="toggleColorMode"
                  class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                  aria-label="Toggle dark mode">
            <UIcon v-if="colorMode.value === 'dark'" name="i-heroicons-sun" class="h-5 w-5" />
            <UIcon v-else name="i-heroicons-moon" class="h-5 w-5" />
          </button>

          <!-- Mobile Menu Button -->
          <button @click.stop="mobileMenuOpen = !mobileMenuOpen"
                  class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                  aria-label="Toggle menu">
            <UIcon v-if="!mobileMenuOpen" name="i-heroicons-bars-3" class="h-6 w-6" />
            <UIcon v-else name="i-heroicons-x-mark" class="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <Transition enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2">
      <div v-if="mobileMenuOpen"
           class="md:hidden absolute left-0 right-0 border-t border-b border-gray-200 bg-white shadow-2xl z-50 dark:bg-gray-900 dark:border-gray-800">
        <div class="container-custom py-4 space-y-2">
          <NuxtLink v-for="item in navItems"
                    :key="item.path"
                    :to="item.path"
                    @click="mobileMenuOpen = false"
                    class="flex items-center space-x-3 px-4 py-3 rounded-lg !text-gray-600 hover:bg-gray-100 hover:!text-black transition-colors font-medium dark:!text-gray-300 dark:hover:bg-gray-800 dark:hover:!text-white"
                    active-class="bg-gray-100 !text-black dark:bg-gray-800 dark:!text-white">
            <UIcon :name="item.icon" class="h-5 w-5" />
            <span>{{ item.name }}</span>
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </nav>
</template>
