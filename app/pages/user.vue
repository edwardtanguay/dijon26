<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: 'Turso Showcase - User Profile',
  meta: [
    { name: 'description', content: 'User profile details.' }
  ]
})

const user = ref({
  given_name: 'Local',
  family_name: 'Developer',
  email: 'local.developer@example.com',
  picture: null
})
</script>

<template>
  <div class="max-w-md mx-auto py-8 sm:py-16 px-0 sm:px-4 space-y-6">
    <div class="bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-8 space-y-6 text-center">
      <div class="flex flex-col items-center space-y-4">
        <!-- Avatar -->
        <div class="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-inner">
          <img v-if="user.picture" :src="user.picture" alt="Avatar" class="w-full h-full object-cover" />
          <span v-else>{{ user.given_name?.[0] || 'U' }}</span>
        </div>
        
        <!-- Name & Email -->
        <div>
          <h1 class="text-2xl font-extrabold text-gray-900 dark:text-white">
            {{ user.given_name }} {{ user.family_name }}
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ user.email }}
          </p>
        </div>
      </div>

      <!-- Details list -->
      <div class="border-t border-gray-100 dark:border-gray-800 pt-6 text-left space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Authentication Mode</span>
          <span class="font-medium text-gray-900 dark:text-white">Disabled (Local User Context)</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 flex flex-col gap-3">
        <NuxtLink
          to="/"
          class="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-center font-semibold rounded-lg transition-all shadow-md"
        >
          Back to Tasks
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
