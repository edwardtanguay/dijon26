<template>
  <div v-if="text" class="outline-content space-y-1">
    <template v-for="item in parsedItems" :key="item.id">
      <div v-if="item.isEmpty" class="h-3 select-none" />
      <div
        v-else
        class="outline-item flex items-start group"
        :style="{ paddingLeft: `${item.indent * 1.25}rem` }"
      >
        <span v-if="item.isBullet" class="text-gray-400 dark:text-gray-500 mr-2 select-none font-bold">
          •
        </span>
        <div class="flex-1 min-w-0">
          <span
            class="inline leading-relaxed break-words"
            :class="textClass || 'text-gray-800 dark:text-gray-200'"
            v-html="renderFormattedContent(item.body)"
          />
          <div v-if="item.image" class="mt-2">
            <div
              v-if="item.image.startsWith('NOT_FOUND:')"
              class="bg-black/90 text-amber-300 font-mono text-xs font-semibold px-3 py-2 rounded-lg inline-flex items-center gap-2 border border-amber-500/30"
            >
              <span>Image introuvable : {{ item.image.replace('NOT_FOUND:', '') }}</span>
            </div>
            <img
              v-else
              :src="`/images/outline/${item.image}`"
              :alt="item.image"
              class="max-w-full max-h-64 object-contain rounded-xl shadow-md border border-gray-200 dark:border-gray-700 my-1 block"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderFormattedContent } from '~/utils/outline-format'

const props = defineProps<{
  text?: string | null
  availableImages?: string[]
  maxLines?: number
  textClass?: string
}>()

interface ParsedOutlineLine {
  id: string
  body: string
  indent: number
  isBullet: boolean
  isEmpty?: boolean
  image?: string
}

const parsedItems = computed<ParsedOutlineLine[]>(() => {
  if (!props.text) return []

  const rawLines = props.text.split('\n')
  const items: ParsedOutlineLine[] = []

  rawLines.forEach((line, idx) => {
    if (!line.trim()) {
      // Préserver la ligne vide comme espacement s'il ne s'agit pas de lignes vides consécutives inutiles
      const prev = items[items.length - 1]
      if (items.length > 0 && prev && !prev.isEmpty) {
        items.push({
          id: `line-empty-${idx}-${Date.now()}`,
          body: '',
          indent: 0,
          isBullet: false,
          isEmpty: true,
        })
      }
      return
    }

    // Calculate indent (tabs or multiples of 2/4 spaces)
    let indent = 0
    while (indent < line.length && line.charAt(indent) === '\t') {
      indent++
    }

    let content = line.substring(indent)
    let isBullet = false

    if (content.startsWith('- ') || content.startsWith('* ')) {
      isBullet = true
      content = content.substring(2)
    } else if (content.startsWith('-') || content.startsWith('*')) {
      isBullet = true
      content = content.substring(1)
    }

    let image: string | undefined = undefined
    const tagMatch = content.match(/##([a-zA-Z0-9_\-]+)\s*$/)
    if (tagMatch) {
      const tag = tagMatch[1]
      content = content.replace(/##[a-zA-Z0-9_\-]+\s*$/, '').trimEnd()

      if (props.availableImages && props.availableImages.length > 0) {
        const found = props.availableImages.find(f => {
          const base = f.substring(0, f.lastIndexOf('.')).toLowerCase()
          return base === tag?.toLowerCase()
        })
        if (found) {
          image = found
        } else {
          image = `NOT_FOUND:${tag}`
        }
      } else {
        // Default fallback match logic
        image = `${tag}.png`
      }
    }

    items.push({
      id: `line-${idx}-${Date.now()}`,
      body: content,
      indent,
      isBullet,
      image,
    })
  })

  // Supprimer toute ligne vide traînante en fin
  while (items.length > 0 && items[items.length - 1]?.isEmpty) {
    items.pop()
  }

  if (props.maxLines && props.maxLines > 0 && items.length > props.maxLines) {
    const truncated = items.slice(0, props.maxLines)
    const lastItem = truncated[truncated.length - 1]
    if (lastItem && !lastItem.body.endsWith('...')) {
      lastItem.body = `${lastItem.body} ...`
    }
    return truncated
  }

  return items
})
</script>

<style scoped>
.font-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
}
.font-courier {
  font-family: "Courier New", Courier, monospace;
}
</style>
