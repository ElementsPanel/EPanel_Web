<script setup lang="ts">
const isScrolled = ref(false)

const updateHeader = () => {
  isScrolled.value = window.scrollY > 12
}

onMounted(() => {
  updateHeader()
  window.addEventListener('scroll', updateHeader, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateHeader)
})
</script>

<template>
  <header class="site-header" :class="{ 'is-scrolled': isScrolled }">
    <div class="site-container header-inner">
      <NuxtLink class="brand" to="/" aria-label="EPanel 首页">
        <span class="brand-mark" aria-hidden="true">E</span>
        <span>EPanel</span>
      </NuxtLink>

      <nav class="header-nav" aria-label="主导航">
        <NuxtLink class="nav-link" to="/">首页</NuxtLink>
      </nav>
    </div>
  </header>
</template>
