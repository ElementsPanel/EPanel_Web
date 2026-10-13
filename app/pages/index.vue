<script setup lang="ts">
const { language } = useSiteLanguage()

const copy = computed(() => language.value === 'zh'
  ? {
      description: 'ElementsPanel 官方网站',
      heroTitle: '元素面板',
      heroIntroduction: '以插件为核心，让每个页面、功能和集成都能自由组合。',
      dashboardAlt: 'ElementsPanel 数据监控页面，展示实例、节点与系统资源概览',
      heading: '一切皆插件',
      introduction: '每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。',
    }
  : {
      description: 'The official ElementsPanel website',
      heroTitle: 'ElementsPanel',
      heroIntroduction: 'Built around plugins. Freely combine every page, feature, and integration.',
      dashboardAlt: 'ElementsPanel dashboard showing instances, nodes, and system resources',
      heading: 'Everything is a plugin',
      introduction: 'Every page, feature, and integration exists as a plugin. Combine only the plugins you need to create a complete ElementsPanel experience.',
    })

useSeoMeta({
  title: 'ElementsPanel',
  description: () => copy.value.description,
})
</script>

<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="site-container hero-copy">
        <h1 id="hero-title">{{ copy.heroTitle }}</h1>
        <p class="hero-description">{{ copy.heroIntroduction }}</p>
      </div>

      <div class="site-container hero-preview">
        <img
          class="hero-dashboard"
          src="/images/elements-panel-dashboard.png"
          :alt="copy.dashboardAlt"
          width="2560"
          height="1519"
          fetchpriority="high"
          decoding="async"
        >
      </div>
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
  </div>
</template>
