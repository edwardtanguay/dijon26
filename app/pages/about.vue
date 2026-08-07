<script setup lang="ts">
useHead({
  title: 'About - Dijon 26',
  meta: [
    { name: 'description', content: 'Learn about Dijon 26, a web application dedicated to exploring the history, culture, landmarks, and geographic maps of Dijon and Burgundy.' }
  ]
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-12 px-4 space-y-8">
    <div class="text-center space-y-3">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white">About Dijon 26</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        A web application dedicated to exploring the rich heritage, landmarks, Wikipedia history, and geographical map datasets of Dijon and the Bourgogne-Franche-Comté region.
      </p>
    </div>

    <div class="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Explore Features</h2>
      <ul class="list-disc pl-5 space-y-2 text-sm sm:text-base">
        <li>Curated selection of essential Wikipedia articles covering Dijon history, architecture, and wine routes.</li>
        <li>Direct download access for official Dijon KMZ map layer files.</li>
        <li>High-resolution regional and topographically detailed maps of Burgundy and France.</li>
        <li>Integrated reactive Turso task management demonstration page.</li>
      </ul>
    </div>
  </div>
</template>
