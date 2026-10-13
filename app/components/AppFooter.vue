<script setup lang="ts">
const currentYear = new Date().getFullYear()
const { language } = useSiteLanguage()

const labels = computed(() => language.value === 'zh'
  ? {
      homeAria: 'ElementsPanel 首页',
      wordmark: {
        src: '/images/elements-panel-wordmark-zh.svg',
        alt: '元素面板',
        width: 2231,
        height: 736,
      },
      copyright: `© ${currentYear} ElementsPanel`,
    }
  : {
      homeAria: 'ElementsPanel home',
      wordmark: {
        src: '/images/elements-panel-wordmark.svg',
        alt: 'ElementsPanel',
        width: 2231,
        height: 737,
      },
      copyright: `© ${currentYear} ElementsPanel`,
    })
</script>

<template>
  <v-footer class="site-footer">
    <NuxtLink class="footer-wordmark" to="/" :aria-label="labels.homeAria">
      <img
        class="footer-wordmark-image"
        :src="labels.wordmark.src"
        :alt="labels.wordmark.alt"
        :width="labels.wordmark.width"
        :height="labels.wordmark.height"
        loading="lazy"
        decoding="async"
      >
    </NuxtLink>

    <div class="footer-inner">
      <p class="footer-copy text-body-small">{{ labels.copyright }}</p>
      <NuxtLink class="footer-icon" to="/" :aria-label="labels.homeAria">
        <img
          class="footer-logo"
          src="/images/elements-panel-logo.svg"
          alt=""
          width="32"
          height="32"
          loading="lazy"
          decoding="async"
        >
      </NuxtLink>
    </div>
  </v-footer>
</template>
