<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

useHead({
  title: 'Dijon 26 - Discover Dijon, Burgundy & Region Maps',
  meta: [
    { name: 'description', content: 'Explore Dijon Wikipedia articles, historic landmarks, regional map downloads (KMZ), and high-resolution geography maps of Burgundy, France.' }
  ]
})

interface GalleryImage {
  src: string
  title: string
  caption: string
}

interface RegionCapital {
  region: string
  capital: string
}

interface Flashcard {
  region: string
  capital: string
  prompt: string
  answer: string
  typeLabel: string
}

const wikiArticles = [
  {
    title: 'Dijon (Overview)',
    url: 'https://en.wikipedia.org/wiki/Dijon',
    description: 'Capital city of the Côte-d’Or department and of the Bourgogne-Franche-Comté region.'
  },
  {
    title: 'History of Dijon',
    url: 'https://en.wikipedia.org/wiki/History_of_Dijon',
    description: 'From ancient Roman settlement of Divio to the historic capital of the Duchy of Burgundy.'
  },
  {
    title: 'Palace of the Dukes of Burgundy',
    url: 'https://en.wikipedia.org/wiki/Palace_of_the_Dukes_of_Burgundy',
    description: 'Remarkably preserved architectural complex housing Dijon’s city hall and fine arts museum.'
  },
  {
    title: 'Dijon Mustard',
    url: 'https://en.wikipedia.org/wiki/Dijon_mustard',
    description: 'Traditional mustard of France named after the city of Dijon.'
  },
  {
    title: 'Route des Grands Crus',
    url: 'https://en.wikipedia.org/wiki/Route_des_Grands_Crus',
    description: 'Prestigious Burgundy wine route running south from Dijon to Santenay.'
  },
  {
    title: 'Dijon Cathedral',
    url: 'https://en.wikipedia.org/wiki/Dijon_Cathedral',
    description: 'Roman Catholic church dedicated to Saint Benignus of Dijon, built between 1280 and 1325.'
  },
  {
    title: 'University of Burgundy',
    url: 'https://en.wikipedia.org/wiki/University_of_Burgundy',
    description: 'Major French public university based in Dijon, founded in 1722.'
  },
  {
    title: 'Gare de Dijon-Ville',
    url: 'https://en.wikipedia.org/wiki/Gare_de_Dijon-Ville',
    description: 'Principal railway station serving Dijon with high-speed TGV connections.'
  },
  {
    title: "Jardin de l'Arquebuse",
    url: 'https://en.wikipedia.org/wiki/Jardin_de_l%27Arquebuse',
    description: 'Botanical garden, arboretum, and natural history museum complex in central Dijon.'
  },
  {
    title: 'Musée des Beaux-Arts de Dijon',
    url: 'https://en.wikipedia.org/wiki/Mus%C3%A9e_des_Beaux-Arts_de_Dijon',
    description: 'One of the oldest and largest museums in France located inside the Palace of the Dukes.'
  }
]

const galleryImages: GalleryImage[] = [
  {
    src: '/images/bourgfranch.png',
    title: 'Bourgogne-Franche-Comté Region',
    caption: 'Map of the administrative region in eastern France formed by the 2016 territorial reform.'
  },
  {
    src: '/images/francerelief.png',
    title: 'France Physical & Relief Map',
    caption: 'Topographical map of France displaying mountain ranges, rivers, and regional elevations.'
  },
  {
    src: '/images/regionsAfter2016.png',
    title: 'French Regions (Post-2016)',
    caption: 'Modern map of France showing the 18 reorganized region boundaries established in 2016.'
  },
  {
    src: '/images/regionsBefore2016.png',
    title: 'French Regions (Pre-2016)',
    caption: 'Historical map of the 27 French administrative regions prior to the 2016 consolidation.'
  }
]

// 13 Metropolitan French Regions established in 2016
const frenchRegions: RegionCapital[] = [
  { region: 'Bourgogne-Franche-Comté', capital: 'Dijon' },
  { region: 'Auvergne-Rhône-Alpes', capital: 'Lyon' },
  { region: 'Bretagne', capital: 'Rennes' },
  { region: 'Centre-Val de Loire', capital: 'Orléans' },
  { region: 'Corse (Corsica)', capital: 'Ajaccio' },
  { region: 'Grand Est', capital: 'Strasbourg' },
  { region: 'Hauts-de-France', capital: 'Lille' },
  { region: 'Île-de-France', capital: 'Paris' },
  { region: 'Normandie', capital: 'Rouen' },
  { region: 'Nouvelle-Aquitaine', capital: 'Bordeaux' },
  { region: 'Occitanie', capital: 'Toulouse' },
  { region: 'Pays de la Loire', capital: 'Nantes' },
  { region: 'Provence-Alpes-Côte d\'Azur', capital: 'Marseille' }
]

// Flashcard State
const flashcardDeck = ref<Flashcard[]>([])
const currentCardIndex = ref(0)
const isAnswerRevealed = ref(false)

const currentCard = computed(() => flashcardDeck.value[currentCardIndex.value])


function shuffleAndBuildDeck() {
  const array = [...frenchRegions]
  // Fisher-Yates Shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]!
    array[i] = array[j]!
    array[j] = temp
  }

  flashcardDeck.value = array.map(item => {
    // Randomize direction: 50% Region -> Capital, 50% Capital -> Region
    const askCapital = Math.random() < 0.5
    if (askCapital) {
      return {
        region: item.region,
        capital: item.capital,
        prompt: `What is the capital city of ${item.region}?`,
        answer: item.capital,
        typeLabel: 'Find the Capital'
      }
    } else {
      return {
        region: item.region,
        capital: item.capital,
        prompt: `Which region has the capital city ${item.capital}?`,
        answer: item.region,
        typeLabel: 'Find the Region'
      }
    }
  })

  currentCardIndex.value = 0
  isAnswerRevealed.value = false
}

function nextCard() {
  if (currentCardIndex.value < flashcardDeck.value.length) {
    currentCardIndex.value++
    isAnswerRevealed.value = false
  }
}

function restartFlashcards() {
  shuffleAndBuildDeck()
}

// Desktop Image Modal & Zoom State
const selectedImage = ref<GalleryImage | null>(null)
const isZoomed = ref(false)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

function handleImageClick(img: GalleryImage) {
  // Only open modal on desktop screens (>= 768px)
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    selectedImage.value = img
    isZoomed.value = false
    panX.value = 0
    panY.value = 0
  }
}

function closeModal() {
  selectedImage.value = null
  isZoomed.value = false
  panX.value = 0
  panY.value = 0
  isDragging.value = false
}

function toggleZoom(event: MouseEvent) {
  event.stopPropagation()
  isZoomed.value = !isZoomed.value
  if (!isZoomed.value) {
    panX.value = 0
    panY.value = 0
  }
}

function startDrag(event: MouseEvent) {
  if (!isZoomed.value) return
  event.preventDefault()
  isDragging.value = true
  dragStart.value = {
    x: event.clientX - panX.value,
    y: event.clientY - panY.value
  }
}

function onDrag(event: MouseEvent) {
  if (!isDragging.value || !isZoomed.value) return
  panX.value = event.clientX - dragStart.value.x
  panY.value = event.clientY - dragStart.value.y
}

function stopDrag() {
  isDragging.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedImage.value) {
    closeModal()
  }
}

onMounted(() => {
  shuffleAndBuildDeck()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6 space-y-12">
    <!-- Hero Header -->
    <div class="text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-sm font-semibold border border-indigo-100 dark:border-indigo-800">
        <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>Bourgogne-Franche-Comté, France</span>
      </div>
      <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Discover Dijon
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
        Explore key Wikipedia articles, map data downloads, and regional geographic maps of Dijon and Burgundy.
      </p>
    </div>

    <!-- KMZ Download Callout Section with High-Contrast Slate Button -->
    <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="flex items-center space-x-2 text-indigo-300 font-semibold text-sm">
          <UIcon name="i-heroicons-map-pin" class="w-5 h-5 shrink-0" />
          <span>GEOGRAPHIC MAP DATA</span>
        </div>
        <h2 class="text-2xl font-bold text-white">Dijon Map File (KMZ)</h2>
        <p class="text-indigo-200 text-sm max-w-lg">
          Download or view the official Dijon map overlay file (<code class="bg-indigo-950/80 px-2 py-0.5 rounded text-indigo-300">dijon-001.kmz</code>) for Google Earth and GIS viewers.
        </p>
      </div>
      <a
        href="/kmz/dijon-001.kmz"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2.5 px-6 py-3.5 bg-slate-950 hover:bg-black !text-white font-bold rounded-xl shadow-xl border border-slate-700/80 hover:border-slate-500 transition-all shrink-0 cursor-pointer text-sm"
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 !text-white shrink-0" />
        <span class="!text-white font-bold">Open KMZ File</span>
        <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 !text-white opacity-90 shrink-0" />
      </a>
    </div>

    <!-- Wikipedia Articles Section -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 dark:border-gray-800 space-y-6">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <UIcon name="i-heroicons-bookmark" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Relevant Wikipedia Articles</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Essential resources for discovering the culture, history, and landmarks of Dijon</p>
          </div>
        </div>
      </div>

      <!-- Bullet List of Links -->
      <ul class="space-y-4">
        <li
          v-for="(article, index) in wikiArticles"
          :key="article.url"
          class="group p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent hover:border-gray-200 dark:hover:border-gray-700/60 transition-all"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start space-x-3.5">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs shrink-0 mt-0.5">
                {{ index + 1 }}
              </span>
              <div>
                <a
                  :href="article.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                >
                  <span>{{ article.title }}</span>
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                </a>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ article.description }}
                </p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Image Gallery Section (Uncropped 100% width on Mobile) -->
    <div class="space-y-6">
      <div class="flex items-center space-x-3 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div class="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
          <UIcon name="i-heroicons-photo" class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Region & Map Gallery</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            High-resolution maps of Burgundy and France (click to view full size on desktop, pinch to zoom on mobile)
          </p>
        </div>
      </div>

      <!-- Image Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="img in galleryImages"
          :key="img.src"
          class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg flex flex-col group cursor-default md:cursor-pointer"
          @click="handleImageClick(img)"
        >
          <!-- Mobile: w-full h-auto object-contain (100% width, no height cutoff) | Desktop: object-cover max-h-[380px] -->
          <div class="overflow-hidden bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
            <img
              :src="img.src"
              :alt="img.title"
              loading="lazy"
              class="w-full h-auto object-contain md:object-cover md:max-h-[380px] transition-transform duration-300 md:group-hover:scale-[1.02]"
            />
          </div>
          <div class="p-5 space-y-1 bg-white dark:bg-gray-900 flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-gray-900 dark:text-white text-base">
                {{ img.title }}
              </h3>
              <span class="hidden md:inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                <UIcon name="i-heroicons-magnifying-glass-plus" class="w-4 h-4" />
                Zoom
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {{ img.caption }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- French Regions & Capitals Flashcards Section (Post-2016) -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-800 space-y-6">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <UIcon name="i-heroicons-academic-cap" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">French Regions Flashcards</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Test your knowledge of the 13 Metropolitan French regions & capitals (established 2016)</p>
          </div>
        </div>

        <!-- Progress Counter -->
        <div v-if="currentCardIndex < flashcardDeck.length" class="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Card {{ currentCardIndex + 1 }} of {{ flashcardDeck.length }}
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="flashcardDeck.length > 0" class="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
        <div
          class="bg-indigo-600 h-full transition-all duration-300 ease-out"
          :style="{ width: `${(currentCardIndex / flashcardDeck.length) * 100}%` }"
        ></div>
      </div>

      <!-- Flashcard Content Area -->
      <div v-if="currentCardIndex < flashcardDeck.length && flashcardDeck.length > 0" class="space-y-6">
        <div class="bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-800/80 dark:to-indigo-950/20 rounded-2xl p-6 sm:p-10 border border-indigo-100/80 dark:border-gray-700/80 text-center space-y-4 shadow-inner">
          <div class="inline-block px-3 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            {{ currentCard?.typeLabel }}
          </div>

          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white max-w-xl mx-auto leading-snug">
            {{ currentCard?.prompt }}
          </h3>

          <!-- Revealed Answer Box -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="isAnswerRevealed" class="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 shadow-md max-w-md mx-auto space-y-1">
              <span class="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Answer</span>
              <p class="text-2xl font-black text-indigo-950 dark:text-indigo-200">
                {{ currentCard?.answer }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            @click="isAnswerRevealed = !isAnswerRevealed"
            class="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm border border-gray-200 dark:border-gray-700"
          >
            <UIcon :name="isAnswerRevealed ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{{ isAnswerRevealed ? 'Hide Answer' : 'Show Answer' }}</span>
          </button>

          <button
            @click="nextCard"
            class="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <span>Next Card</span>
            <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Completion Screen -->
      <div v-else-if="flashcardDeck.length > 0" class="text-center py-8 sm:py-12 space-y-6">
        <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
          <UIcon name="i-heroicons-check-circle" class="w-10 h-10" />
        </div>

        <div class="space-y-2">
          <h3 class="text-3xl font-black text-gray-900 dark:text-white">🎉 Félicitations!</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-base">
            You have successfully completed all 13 French region and capital flashcards!
          </p>
        </div>

        <div>
          <button
            @click="restartFlashcards"
            class="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all inline-flex items-center gap-2.5 cursor-pointer text-sm"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
            <span>Start Over (Shuffle Deck)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Desktop Full Screen Image Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selectedImage"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none"
        @click="closeModal"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <!-- Top Toolbar -->
        <div class="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-10 pointer-events-auto">
          <div class="bg-black/60 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium">
            <span>{{ selectedImage.title }}</span>
            <span class="text-gray-400 text-xs ml-2">({{ isZoomed ? 'Click to reset scale' : 'Click image to zoom 1.8x' }})</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click.stop="toggleZoom"
              class="p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <UIcon :name="isZoomed ? 'i-heroicons-magnifying-glass-minus' : 'i-heroicons-magnifying-glass-plus'" class="w-5 h-5" />
              <span>{{ isZoomed ? 'Reset' : '1.8x Zoom' }}</span>
            </button>

            <button
              @click="closeModal"
              class="p-2.5 bg-black/60 hover:bg-red-900/80 text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Modal Image Container -->
        <div
          class="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
          @click.stop="toggleZoom"
          @mousedown="startDrag"
        >
          <img
            :src="selectedImage.src"
            :alt="selectedImage.title"
            class="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl transition-transform duration-150 ease-out"
            :class="{
              'cursor-zoom-in': !isZoomed,
              'cursor-grab': isZoomed && !isDragging,
              'cursor-grabbing': isZoomed && isDragging
            }"
            :style="{
              transform: isZoomed
                ? `scale(1.8) translate(${panX / 1.8}px, ${panY / 1.8}px)`
                : 'scale(1) translate(0px, 0px)'
            }"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
