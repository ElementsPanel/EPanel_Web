<script setup lang="ts">
const { language } = useSiteLanguage()

useHead(() => ({
  htmlAttrs: {
    lang: language.value === 'zh' ? 'zh-CN' : 'en',
  },
}))
</script>

<template>
  <NuxtLoadingIndicator color="#2982FF" :throttle="0" />
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
