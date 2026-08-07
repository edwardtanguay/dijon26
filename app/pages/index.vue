<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

useHead({
  title: 'Dijon 26 - Découvrir Dijon, la Bourgogne & les Cartes Régionales',
  meta: [
    { name: 'description', content: 'Explore les articles Wikipédia de Dijon, les monuments historiques, les cartes régionales à télécharger (KMZ) et les cartes géographiques haute résolution de Bourgogne, France.' }
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
    title: 'Dijon (Vue d’ensemble)',
    url: 'https://fr.wikipedia.org/wiki/Dijon',
    description: 'Chef-lieu du département de la Côte-d’Or et préfecture de la région Bourgogne-Franche-Comté.'
  },
  {
    title: 'Histoire de Dijon',
    url: 'https://fr.wikipedia.org/wiki/Histoire_de_Dijon',
    description: 'De l’antique cité romaine de Divio à la capitale historique du duché de Bourgogne.'
  },
  {
    title: 'Palais des Ducs de Bourgogne',
    url: 'https://fr.wikipedia.org/wiki/Palais_des_ducs_de_Bourgogne',
    description: 'Ensemble architectural remarquablement conservé abritant l’hôtel de ville et le musée des Beaux-Arts de Dijon.'
  },
  {
    title: 'Moutarde de Dijon',
    url: 'https://fr.wikipedia.org/wiki/Moutarde_de_Dijon',
    description: 'Moutarde traditionnelle française originaire de la ville de Dijon.'
  },
  {
    title: 'Route des Grands Crus',
    url: 'https://fr.wikipedia.org/wiki/Route_des_Grands_Crus',
    description: 'Prestigieuse route des vins de Bourgogne s’étendant au sud de Dijon jusqu’à Santenay.'
  },
  {
    title: 'Cathédrale Saint-Bénigne de Dijon',
    url: 'https://fr.wikipedia.org/wiki/Cath%C3%A9drale_Saint-B%C3%A9nigne_de_Dijon',
    description: 'Église catholique romaine dédiée à Saint Bénigne de Dijon, construite entre 1280 et 1325.'
  },
  {
    title: 'Université de Bourgogne',
    url: 'https://fr.wikipedia.org/wiki/Universit%C3%A9_de_Bourgogne',
    description: 'Grande université publique française basée à Dijon, fondée en 1722.'
  },
  {
    title: 'Gare de Dijon-Ville',
    url: 'https://fr.wikipedia.org/wiki/Gare_de_Dijon-Ville',
    description: 'Principale gare ferroviaire desservant Dijon avec des liaisons TGV à grande vitesse.'
  },
  {
    title: "Jardin de l'Arquebuse",
    url: 'https://fr.wikipedia.org/wiki/Jardin_de_l%27Arquebuse',
    description: 'Ensemble comprenant un jardin botanique, un arboretum et le musée d’histoire naturelle du centre de Dijon.'
  },
  {
    title: 'Musée des Beaux-Arts de Dijon',
    url: 'https://fr.wikipedia.org/wiki/Mus%C3%A9e_des_Beaux-Arts_de_Dijon',
    description: 'L’un des plus anciens et plus grands musées de France, situé au sein du palais des Ducs.'
  }
]

const galleryImages: GalleryImage[] = [
  {
    src: '/images/bourgfranch.png',
    title: 'Région Bourgogne-Franche-Comté',
    caption: 'Carte de la région administrative de l’est de la France issue de la réforme territoriale de 2016.'
  },
  {
    src: '/images/francerelief.png',
    title: 'Carte Physique & Relief de la France',
    caption: 'Carte topographique de la France présentant les massifs montagneux, fleuves et reliefs régionaux.'
  },
  {
    src: '/images/regionsAfter2016.png',
    title: 'Régions Françaises (Après 2016)',
    caption: 'Carte moderne de la France montrant le découpage en 18 régions réorganisées en 2016.'
  },
  {
    src: '/images/regionsBefore2016.png',
    title: 'Régions Françaises (Avant 2016)',
    caption: 'Carte historique des 27 régions administratives françaises avant le regroupement de 2016.'
  }
]

// 13 Metropolitan French Regions established in 2016
const frenchRegions: RegionCapital[] = [
  { region: 'Bourgogne-Franche-Comté', capital: 'Dijon' },
  { region: 'Auvergne-Rhône-Alpes', capital: 'Lyon' },
  { region: 'Bretagne', capital: 'Rennes' },
  { region: 'Centre-Val de Loire', capital: 'Orléans' },
  { region: 'Corse', capital: 'Ajaccio' },
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
        prompt: `Quelle est la capitale de la région ${item.region} ?`,
        answer: item.capital,
        typeLabel: 'Trouver la Capitale'
      }
    } else {
      return {
        region: item.region,
        capital: item.capital,
        prompt: `Quelle région a pour préfecture / capitale ${item.capital} ?`,
        answer: item.region,
        typeLabel: 'Trouver la Région'
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
        Découvre Dijon
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
        Explore les articles Wikipédia essentiels, télécharge les données cartographiques et découvre les cartes géographiques de Dijon et de la Bourgogne.
      </p>
    </div>

    <!-- KMZ Download Callout Section with High-Contrast Slate Button -->
    <div class="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="flex items-center space-x-2 text-indigo-300 font-semibold text-sm">
          <UIcon name="i-heroicons-map-pin" class="w-5 h-5 shrink-0" />
          <span>DONNÉES CARTOGRAPHIQUES</span>
        </div>
        <h2 class="text-2xl font-bold text-white">Fichier de Carte de Dijon (KMZ)</h2>
        <p class="text-indigo-200 text-sm max-w-lg">
          Télécharge ou visualise le fichier officiel de superposition de carte de Dijon (<code class="bg-indigo-950/80 px-2 py-0.5 rounded text-indigo-300">dijon-001.kmz</code>) pour Google Earth et logiciels SIG.
        </p>
      </div>
      <a
        href="/kmz/dijon-001.kmz"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2.5 px-6 py-3.5 bg-slate-950 hover:bg-black !text-white font-bold rounded-xl shadow-xl border border-slate-700/80 hover:border-slate-500 transition-all shrink-0 cursor-pointer text-sm"
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 !text-white shrink-0" />
        <span class="!text-white font-bold">Ouvre le fichier KMZ</span>
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
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Articles Wikipédia Pertinents</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Ressources essentielles pour découvrir la culture, l'histoire et le patrimoine de Dijon</p>
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
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Galerie de Cartes & Régions</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Cartes haute résolution de Bourgogne et de France (clique pour agrandir sur ordinateur)
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
      <div class="border-b border-gray-100 dark:border-gray-800 pb-4 text-center space-y-2">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Flashcards des Régions Françaises</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Teste tes connaissances sur les 13 régions métropolitaines & leurs chefs-lieux (découpage 2016)</p>

        <!-- Progress Counter Centered Below Subtitle -->
        <div v-if="currentCardIndex < flashcardDeck.length" class="pt-1">
          <span class="inline-block text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Carte {{ currentCardIndex + 1 }} sur {{ flashcardDeck.length }}
          </span>
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
        <div
          @click="isAnswerRevealed = !isAnswerRevealed"
          class="bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-800/80 dark:to-indigo-950/20 rounded-2xl p-6 sm:p-10 border border-indigo-100/80 hover:border-indigo-300 dark:border-gray-700/80 dark:hover:border-indigo-700/80 text-center space-y-4 shadow-inner cursor-pointer select-none transition-all"
        >
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
            <div v-if="isAnswerRevealed" class="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 shadow-md max-w-md mx-auto">
              <p class="text-2xl font-black text-indigo-950 dark:text-indigo-200">
                {{ currentCard?.answer }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Controls (Centered Next Card Button - Only shown when answer is revealed) -->
        <div v-if="isAnswerRevealed" class="flex justify-center">
          <button
            @click="nextCard"
            class="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <span>Carte suivante</span>
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
          <h3 class="text-3xl font-black text-gray-900 dark:text-white">🎉 Félicitations !</h3>
          <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto text-base">
            Tu as réussi les 13 flashcards des régions de France et de leurs chefs-lieux !
          </p>
        </div>

        <div>
          <button
            @click="restartFlashcards"
            class="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all inline-flex items-center gap-2.5 cursor-pointer text-sm"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
            <span>Recommencer (Mélanger les cartes)</span>
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
