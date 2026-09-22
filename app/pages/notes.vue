<template>
  <div class="max-w-4xl mx-auto px-4 pt-2 pb-2 sm:py-4">
    <TransitionGroup tag="ul" name="fade" class="space-y-0.5 list-disc text-gray-800 dark:text-gray-200 pl-5">
      <li
        v-for="item in visibleNotes"
        :key="item.id"
        class="py-0.5 leading-snug break-words"
        :class="[item.isFlashcardQuestion ? 'list-none -ml-4 sm:-ml-5' : 'outline-item-li']"
        :style="{ marginLeft: item.isFlashcardQuestion ? `calc(${item.indent * 1.5}rem - 1.25rem)` : `${item.indent * 1.5}rem` }"
      >
        <!-- Flashcard Header Line -->
        <div v-if="item.isFlashcardHeader" class="space-y-1.5">
          <div class="inline-flex flex-wrap items-center gap-2.5">
            <span class="font-semibold text-gray-900 dark:text-white">
              <span v-html="renderFormattedContent(item.body)" />
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1.5">
                ({{ getSectionStats(item.id).learned }} sur {{ getSectionStats(item.id).total }})
              </span>
            </span>
            <div class="inline-flex items-center gap-1.5 text-xs">
              <button
                type="button"
                @click="resetSectionFlashcards(item.id)"
                class="px-2 py-0.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer"
                title="Réafficher et replier toutes les cartes de cette section"
              >
                Réinitialiser
              </button>
            </div>
          </div>
          <!-- Message de félicitations lorsque toutes les cartes de la section sont apprises -->
          <div
            v-if="getSectionStats(item.id).allLearned"
            class="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60"
          >
            <span>🎉 Bravo ! Tu as appris toutes les cartes de cette section.</span>
          </div>
        </div>

        <!-- Flashcard Question Line -->
        <div
          v-else-if="item.isFlashcardQuestion"
          class="inline-flex items-start gap-1.5 cursor-pointer font-medium transition-all duration-150 select-none group"
          :class="[
            expandedQuestionIds.has(item.id)
              ? 'bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 rounded-md px-2.5 py-1 shadow-xs'
              : 'hover:text-indigo-600 dark:hover:text-indigo-400 py-0.5'
          ]"
          @click="toggleQuestion(item.id)"
        >
          <svg
            class="w-3.5 h-3.5 mt-1 inline-block transition-transform duration-200 shrink-0"
            :class="[
              expandedQuestionIds.has(item.id)
                ? 'rotate-90 text-amber-600 dark:text-amber-400'
                : 'text-gray-400 group-hover:text-indigo-500'
            ]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span v-html="renderFormattedContent(item.body)" />
        </div>

        <!-- Regular Line or Flashcard Answer -->
        <span
          v-else
          class="inline"
          v-html="renderFormattedContent(item.body)"
        />

        <div v-if="item.image" class="mt-1 w-full">
          <div
            v-if="item.image.startsWith('NOT_FOUND:')"
            class="bg-black text-yellow-400 font-mono text-base font-semibold w-[300px] h-[200px] flex flex-col items-center justify-center text-center rounded p-4 shadow-md my-2"
          >
            no image "{{ item.image.replace('NOT_FOUND:', '') }}" found
          </div>
          <img
            v-else
            :src="`/images/outline/${item.image}`"
            :alt="item.image"
            class="max-w-full h-auto rounded shadow-sm my-1 block"
          />
        </div>

        <!-- Bouton vert "Appris" affiché au bas du contenu déplié -->
        <div v-if="getQuestionIdForLearnedButton(item)" class="mt-2 mb-1">
          <button
            type="button"
            @click.stop="markAsLearned(getQuestionIdForLearnedButton(item)!)"
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors cursor-pointer select-none"
            title="Marquer cette flashcard comme apprise"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Appris</span>
          </button>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import notesData from '~~/data-parsed/dijon.json'

interface OutlineItem {
  id: string
  body: string
  indent: number
  image?: string
  isFlashcardHeader?: boolean
  flashcardTotalCount?: number
  isFlashcardQuestion?: boolean
  isFlashcardAnswer?: boolean
  flashcardQuestionId?: string
  flashcardHeaderId?: string
}

const notes: OutlineItem[] = notesData

useHead({
  title: 'Notes - Dijon 26',
  meta: [
    { name: 'description', content: 'Notes et outline de préparation pour Dijon' }
  ]
})

const STORAGE_KEY_EXPANDED = 'dijon_expanded_flashcards'
const STORAGE_KEY_LEARNED = 'dijon_learned_flashcards'

const expandedQuestionIds = ref<Set<string>>(new Set())
const learnedQuestionIds = ref<Set<string>>(new Set())

onMounted(() => {
  try {
    const savedExpanded = localStorage.getItem(STORAGE_KEY_EXPANDED)
    if (savedExpanded) {
      const parsed = JSON.parse(savedExpanded)
      if (Array.isArray(parsed)) {
        expandedQuestionIds.value = new Set(parsed)
      }
    }
    const savedLearned = localStorage.getItem(STORAGE_KEY_LEARNED)
    if (savedLearned) {
      const parsed = JSON.parse(savedLearned)
      if (Array.isArray(parsed)) {
        learnedQuestionIds.value = new Set(parsed)
      }
    }
  } catch (e) {
    console.error('Erreur lors du chargement de localStorage:', e)
  }
})

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify(Array.from(expandedQuestionIds.value)))
    localStorage.setItem(STORAGE_KEY_LEARNED, JSON.stringify(Array.from(learnedQuestionIds.value)))
  } catch (e) {
    console.error('Erreur lors de la sauvegarde dans localStorage:', e)
  }
}

const getSectionStats = (headerId: string) => {
  const sectionQuestions = notes.filter(item => item.isFlashcardQuestion && item.flashcardHeaderId === headerId)
  const total = sectionQuestions.length
  const learned = sectionQuestions.filter(q => learnedQuestionIds.value.has(q.id)).length
  return {
    total,
    learned,
    allLearned: total > 0 && learned === total
  }
}

const resetSectionFlashcards = (headerId: string) => {
  const sectionQuestions = notes.filter(item => item.isFlashcardQuestion && item.flashcardHeaderId === headerId)
  for (const q of sectionQuestions) {
    learnedQuestionIds.value.delete(q.id)
    expandedQuestionIds.value.delete(q.id)
  }
  learnedQuestionIds.value = new Set(learnedQuestionIds.value)
  expandedQuestionIds.value = new Set(expandedQuestionIds.value)
  saveState()
}

const toggleQuestion = (questionId: string) => {
  if (expandedQuestionIds.value.has(questionId)) {
    expandedQuestionIds.value.delete(questionId)
  } else {
    expandedQuestionIds.value.add(questionId)
  }
  expandedQuestionIds.value = new Set(expandedQuestionIds.value)
  saveState()
}

const markAsLearned = (questionId: string) => {
  learnedQuestionIds.value.add(questionId)
  expandedQuestionIds.value.delete(questionId)
  learnedQuestionIds.value = new Set(learnedQuestionIds.value)
  expandedQuestionIds.value = new Set(expandedQuestionIds.value)
  saveState()
}

// Prédétermination du dernier élément associé à chaque question pour l'affichage du bouton "Appris"
const lastItemIdForQuestion = computed(() => {
  const map = new Map<string, string>()
  for (const item of notes) {
    if (item.isFlashcardQuestion) {
      map.set(item.id, item.id)
    } else if (item.isFlashcardAnswer && item.flashcardQuestionId) {
      map.set(item.flashcardQuestionId, item.id)
    }
  }
  return map
})

const getQuestionIdForLearnedButton = (item: OutlineItem): string | null => {
  if (item.isFlashcardQuestion) {
    if (expandedQuestionIds.value.has(item.id) && !learnedQuestionIds.value.has(item.id)) {
      if (lastItemIdForQuestion.value.get(item.id) === item.id) {
        return item.id
      }
    }
  } else if (item.isFlashcardAnswer && item.flashcardQuestionId) {
    if (expandedQuestionIds.value.has(item.flashcardQuestionId) && !learnedQuestionIds.value.has(item.flashcardQuestionId)) {
      if (lastItemIdForQuestion.value.get(item.flashcardQuestionId) === item.id) {
        return item.flashcardQuestionId
      }
    }
  }
  return null
}

const isItemVisible = (item: OutlineItem): boolean => {
  if (item.isFlashcardQuestion) {
    return !learnedQuestionIds.value.has(item.id)
  }
  if (item.isFlashcardAnswer) {
    if (!item.flashcardQuestionId) return false
    if (learnedQuestionIds.value.has(item.flashcardQuestionId)) return false
    return expandedQuestionIds.value.has(item.flashcardQuestionId)
  }
  return true
}

const visibleNotes = computed(() => notes.filter(isItemVisible))

// Function to escape HTML special characters to prevent XSS
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Clean URL hostname (e.g. https://www.openrunner.com/route-details/23448723 -> openrunner.com)
const simplifyUrl = (rawUrl: string): string => {
  try {
    const urlObj = new URL(rawUrl)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return rawUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || rawUrl
  }
}

// Generate link HTML with icon and simplified URL text
const createFormattedLinkHtml = (url: string, linkText?: string): string => {
  const isYoutube = url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be')
  
  let displayText = ''
  if (linkText && linkText.trim()) {
    displayText = linkText.trim()
  } else if (isYoutube) {
    displayText = 'youtube.com'
  } else {
    displayText = escapeHtml(simplifyUrl(url))
  }

  // 18x12px matches the height of lowercase letters (x-height)
  const youtubeIcon = `<svg class="inline-block w-[18px] h-[12px] mr-1 text-red-600 fill-none stroke-current align-middle flex-shrink-0" viewBox="1.5 4.5 21 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 2px;"><rect width="20" height="14" x="2" y="5" rx="4" fill="currentColor" stroke="none"/><polygon points="10 9 15 12 10 15 10 9" fill="white" stroke="none"/></svg>`
  
  const externalLinkIcon = `<svg class="inline-block w-3.5 h-3.5 mr-1 text-indigo-500 stroke-current fill-none align-middle flex-shrink-0" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 1px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`

  const icon = isYoutube ? youtubeIcon : externalLinkIcon

  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline text-indigo-600 dark:text-indigo-400 no-underline hover:underline hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">${icon}<span>${displayText}</span></a>`
}

// Render markdown & emoticons
const renderFormattedContent = (text: string): string => {
  if (!text) return ''

  let html = escapeHtml(text)

  // Emoticons: :thinking: -> WhatsApp style thinking face emoji
  const whatsappThinkingEmoji = `<span class="inline font-emoji text-lg align-middle" title=":thinking:">🤔</span>`
  html = html.replace(/:thinking:/g, whatsappThinkingEmoji)

  // 1. Markdown links: [title](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, title, url) => createFormattedLinkHtml(url, title)
  )

  // 2. Bare URLs (http:// or https://) - matching only URLs not already in HTML attributes
  html = html.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_match, prefix, url) => `${prefix}${createFormattedLinkHtml(url)}`
  )

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')

  // Pronunciation: [text] at end of line (subdued gray-yellow color, font-mono / courier)
  html = html.replace(
    /\s*\[([^\]]+)\]\s*$/,
    ' <span class="font-mono text-sm text-[#b8a862] dark:text-[#d3c578] font-normal font-courier">[$1]</span>'
  )

  return html
}
</script>

<style scoped>
/* Font stack prioritizing WhatsApp / Apple emoji rendering */
.font-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
}

.font-courier {
  font-family: "Courier New", Courier, monospace;
}

.outline-item-li {
  display: list-item;
}

.outline-item-li::marker {
  font-size: 0.8em;
  vertical-align: 0.1em;
}

/* Smooth fade for flashcards transition */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
