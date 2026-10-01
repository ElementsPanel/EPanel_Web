<script setup lang="ts">
const { language } = useSiteLanguage()

const copy = computed(() => language.value === 'zh'
  ? {
      description: 'ElementsPanel 官方网站',
      wordmark: {
        src: '/images/elements-panel-wordmark-zh.svg',
        alt: '元素面板',
        width: 2231,
        height: 736,
      },
      heading: '一切皆插件',
      introduction: '每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。',
    }
  : {
      description: 'The official ElementsPanel website',
      wordmark: {
        src: '/images/elements-panel-wordmark.svg',
        alt: 'ElementsPanel',
        width: 2231,
        height: 737,
      },
      heading: 'Everything is a plugin',
      introduction: 'Every page, feature, and integration exists as a plugin. Combine only the plugins you need to create a complete ElementsPanel experience.',
    })

useSeoMeta({
  title: 'ElementsPanel',
  description: () => copy.value.description,
})
</script>

<template>
  <section class="hero">
    <img
      class="hero-wordmark"
      :src="copy.wordmark.src"
      :alt="copy.wordmark.alt"
      :width="copy.wordmark.width"
      :height="copy.wordmark.height"
      fetchpriority="high"
    >
  </section>

  <section class="plugin-section">
    <div class="site-container plugin-inner">
      <v-icon
        class="plugin-icon"
        icon="mdi-puzzle-outline"
        aria-hidden="true"
      />

      <div class="plugin-content">
        <h2>{{ copy.heading }}</h2>
        <p class="plugin-description">{{ copy.introduction }}</p>
      </div>
    </div>
  </section>
</template>
