<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <v-footer class="site-footer">
    <div class="site-container footer-inner">
      <NuxtLink class="brand" to="/" aria-label="ElementsPanel 首页">
        <v-avatar color="primary" rounded="lg" size="28">
          <span class="brand-mark-letter">E</span>
        </v-avatar>
        <span class="brand-title text-title-medium">ElementsPanel</span>
      </NuxtLink>
      <p class="footer-copy text-body-small">© {{ currentYear }} ElementsPanel. All rights reserved.</p>
    </div>
  </v-footer>
</template>
