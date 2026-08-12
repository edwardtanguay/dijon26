<template>
  <div class="max-w-4xl mx-auto px-4 py-2 sm:py-4">
    <ul class="space-y-0.5 list-disc list-inside text-gray-800 dark:text-gray-200">
      <li
        v-for="item in notes"
        :key="item.id"
        class="py-0.5 leading-snug break-words"
        :style="{ paddingLeft: getPaddingLeft(item.indent) }"
      >
        <span
          class="inline-block"
          v-html="renderFormattedContent(item.body)"
        />
      </li>
    </ul>
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
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return `${indent * 0.85}rem`
  }
  return `${indent * 1.25}rem`
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
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">$1</a>'
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
