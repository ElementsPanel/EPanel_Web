<script setup lang="ts">
const currentYear = new Date().getFullYear()
const { language } = useSiteLanguage()

const labels = computed(() => language.value === 'zh'
  ? {
      homeAria: 'ElementsPanel 首页',
      copyright: `© ${currentYear} ElementsPanel。保留所有权利。`,
    }
  : {
      homeAria: 'ElementsPanel home',
      copyright: `© ${currentYear} ElementsPanel. All rights reserved.`,
    })
</script>

<template>
  <v-footer class="site-footer">
    <div class="site-container footer-inner">
      <NuxtLink class="brand" to="/" :aria-label="labels.homeAria">
        <v-avatar color="primary" rounded="lg" size="28">
          <span class="brand-mark-letter">E</span>
        </v-avatar>
        <span class="brand-title text-title-medium">ElementsPanel</span>
      </NuxtLink>
      <p class="footer-copy text-body-small">{{ labels.copyright }}</p>
    </div>
  </v-footer>
</template>
