<script setup lang="ts">
import { ref } from 'vue'

useHead({
  title: 'Turso Showcase',
  meta: [
    { name: 'description', content: 'A showcase web application built with Nuxt 3, Prisma ORM, and Turso (SQLite on the edge)' }
  ]
})

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

// Fetch tasks from GET API endpoint
const { data: tasks, refresh, status } = await useFetch<Task[]>('/api/tasks')
const newTaskTitle = ref('')
const isAdding = ref(false)
const deletingId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

async function handleAddTask() {
  if (!newTaskTitle.value.trim() || isAdding.value) return
  isAdding.value = true
  errorMessage.value = null
  try {
    await $fetch('/api/tasks', {
      method: 'POST',
      body: { title: newTaskTitle.value.trim() }
    })
    newTaskTitle.value = ''
    await refresh()
  } catch (error: any) {
    console.error('Failed to add task:', error)
    errorMessage.value = error.data?.statusMessage || error.statusMessage || error.message || 'Add limit reached: Maximum 10 tasks allowed'
  } finally {
    isAdding.value = false
  }
}

async function handleDeleteTask(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  errorMessage.value = null
  try {
    await $fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    })
    await refresh()
  } catch (error) {
    console.error('Failed to delete task:', error)
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto py-8 sm:py-16 px-0 sm:px-4 space-y-6">
    <div class="space-y-8">
      <!-- Header Section -->
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Turso Todo Manager
        </h1>
        <p class="text-lg text-gray-500 dark:text-gray-400">
          A real-time reactive task list powered by Nuxt 3, Prisma ORM, and Turso.
        </p>
      </div>

      <!-- Card Container -->
      <div class="bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-8 space-y-6">
        <!-- Add Task Form -->
        <form @submit.prevent="handleAddTask" class="flex gap-2">
          <input
            v-model="newTaskTitle"
            @input="errorMessage = null"
            type="text"
            required
            placeholder="Add a new task..."
            class="flex-1 min-w-0 px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-950 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            :disabled="isAdding"
          />
          <button
            type="submit"
            :disabled="isAdding || !newTaskTitle.trim()"
            class="px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center gap-2 shrink-0"
          >
            <span v-if="isAdding" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Add
          </button>
        </form>

        <!-- Error Banner -->
        <div v-if="errorMessage" class="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 flex items-center justify-between text-red-700 dark:text-red-300 text-sm font-medium animate-fade-in">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>
          <button @click="errorMessage = null" class="p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-lg text-red-500 transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="status === 'pending' && (!tasks || tasks.length === 0)" class="py-12 flex flex-col items-center justify-center space-y-3">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm text-gray-500">Retrieving tasks...</p>
        </div>

        <!-- Task List -->
        <div v-else-if="tasks && tasks.length > 0" :class="{ 'opacity-60 pointer-events-none': status === 'pending' }" class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto pr-1 transition-opacity duration-200">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="py-4 flex items-center justify-between group animate-fade-in"
          >
            <div class="flex items-center space-x-3">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span class="text-gray-700 dark:text-gray-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {{ task.title }}
              </span>
            </div>
            
            <button
              @click="handleDeleteTask(task.id)"
              :disabled="deletingId === task.id"
              class="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              aria-label="Delete task"
            >
              <svg v-if="deletingId === task.id" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="status !== 'pending'" class="text-center py-12 space-y-2">
          <p class="text-gray-400 dark:text-gray-500 font-medium">No tasks found</p>
          <p class="text-sm text-gray-400">Add some above to verify your Turso database integration!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
