<template>
  <div class="min-h-screen flex flex-col">
    <Navigation />
    <main class="flex-1 py-4 sm:py-12">
      <UContainer>
        <slot />
      </UContainer>
    </main>
    <Footer/>
  </div>
</template>

<script setup lang="ts">
</script>
