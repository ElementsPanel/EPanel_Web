<script setup lang="ts">
const { language, toggleLanguage } = useSiteLanguage()

const labels = computed(() => language.value === 'zh'
  ? {
      home: '首页',
      docs: '文档',
      navigation: '主导航',
      homeAria: 'ElementsPanel 首页',
      switchLanguage: 'Switch to English',
      languageTarget: 'English',
    }
  : {
      home: 'Home',
      docs: 'Docs',
      navigation: 'Main navigation',
      homeAria: 'ElementsPanel home',
      switchLanguage: '切换为中文',
      languageTarget: '中文',
    })
</script>

<template>
  <v-app-bar class="site-header" color="surface" :elevation="0">
    <div class="site-container header-inner">
      <NuxtLink class="brand" to="/" :aria-label="labels.homeAria">
        <v-avatar color="primary" rounded="lg" size="32">
          <span class="brand-mark-letter">E</span>
        </v-avatar>
        <span class="brand-title text-title-large">ElementsPanel</span>
      </NuxtLink>

      <div class="header-actions">
        <nav class="header-nav" :aria-label="labels.navigation">
          <v-btn to="/" variant="text">{{ labels.home }}</v-btn>
          <v-btn to="/docs" variant="text">{{ labels.docs }}</v-btn>
        </nav>

        <v-btn
          class="language-toggle"
          prepend-icon="mdi-translate"
          variant="outlined"
          size="small"
          :aria-label="labels.switchLanguage"
          :title="labels.switchLanguage"
          @click="toggleLanguage"
        >
          {{ labels.languageTarget }}
        </v-btn>
      </div>
    </div>
  </v-app-bar>
</template>
