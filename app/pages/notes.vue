<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
      <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
        <span class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
          <UIcon name="i-heroicons-list-bullet" class="w-8 h-8 block" />
        </span>
        Notes
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Structure hiérarchique des notes de Dijon ({{ notes.length }} éléments)
      </p>
    </div>

    <div class="space-y-1 bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700/60">
      <div
        v-for="item in notes"
        :key="item.id"
        class="transition-colors rounded-lg py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 group flex items-start gap-2"
        :style="{ paddingLeft: getPaddingLeft(item.indent) }"
      >
        <span
          class="inline-block mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
          :class="[
            item.indent === 0 ? 'bg-indigo-600 dark:bg-indigo-400' :
            item.indent === 1 ? 'bg-purple-500 dark:bg-purple-400' :
            'bg-gray-400 dark:bg-gray-500'
          ]"
        />
        <div
          class="text-gray-800 dark:text-gray-200 leading-relaxed text-sm sm:text-base break-words flex-1 min-w-0"
          v-html="renderFormattedContent(item.body)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import notesData from '~~/data-parsed/dijon.json'

interface OutlineItem {
  id: string
  body: string
  indent: number
}

const notes: OutlineItem[] = notesData

useHead({
  title: 'Notes - Dijon 26',
  meta: [
    { name: 'description', content: 'Notes et outline de préparation pour Dijon' }
  ]
})

const getPaddingLeft = (indent: number) => {
  // Mobile responsive indent calculation
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return `${indent * 0.85 + 0.5}rem`
  }
  return `${indent * 1.35 + 0.5}rem`
}

// Function to escape HTML special characters to prevent XSS
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Render markdown & emoticons
const renderFormattedContent = (text: string): string => {
  if (!text) return ''

  let html = escapeHtml(text)

  // Emoticons: :thinking: -> WhatsApp style thinking face emoji
  const whatsappThinkingEmoji = `<span class="inline-inline font-emoji text-lg align-middle" title=":thinking:">🤔</span>`
  html = html.replace(/:thinking:/g, whatsappThinkingEmoji)

  // Markdown links: [title](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors inline-flex items-center gap-1">$1 <svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a>'
  )

  // Bare URLs (http:// or https://)
  html = html.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 break-all transition-colors">$2</a>'
  )

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')

  return html
}
</script>

<style scoped>
/* Font stack prioritizing WhatsApp / Apple emoji rendering */
.font-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
}
</style>
