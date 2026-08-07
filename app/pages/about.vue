<script setup lang="ts">
useHead({
  title: 'À propos - Dijon 26',
  meta: [
    { name: 'description', content: 'Découvre Dijon 26, une application web dédiée à l’exploration de l’histoire, de la culture, du patrimoine et des cartes géographiques de Dijon et de la Bourgogne.' }
  ]
})
</script>

<template>
  <div class="max-w-3xl mx-auto py-12 px-4 space-y-8">
    <div class="text-center space-y-3">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white">À propos de Dijon 26</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400">
        Une application web dédiée à l’exploration du riche patrimoine, des monuments historiques, des articles Wikipédia et des jeux de données cartographiques de Dijon et de la région Bourgogne-Franche-Comté.
      </p>
    </div>

    <div class="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Fonctionnalités principales</h2>
      <ul class="list-disc pl-5 space-y-2 text-sm sm:text-base">
        <li>Sélection d’articles Wikipédia essentiels couvrant l’histoire de Dijon, son architecture et la Route des Grands Crus.</li>
        <li>Téléchargement direct du fichier de superposition cartographique officiel KMZ de Dijon.</li>
        <li>Galerie de cartes haute résolution régionales et topographiques de la Bourgogne et de la France.</li>
        <li>Espace interactif de gestion de tâches Turso.</li>
      </ul>
    </div>
  </div>
</template>
