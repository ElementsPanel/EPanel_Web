<script setup lang="ts">
const { language } = useSiteLanguage()

useHead(() => ({
  htmlAttrs: {
    lang: language.value === 'zh' ? 'zh-CN' : 'en',
  },
}))
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
