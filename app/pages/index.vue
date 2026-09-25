<script setup lang="ts">
const { language } = useSiteLanguage()

const copy = computed(() => language.value === 'zh'
  ? {
      description: 'ElementsPanel 官方网站',
      screenshotAlt: 'ElementsPanel 应用实例管理界面',
      heading: '一切皆插件',
      introduction: '每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。',
    }
  : {
      description: 'The official ElementsPanel website',
      screenshotAlt: 'ElementsPanel application instance management interface',
      heading: 'Everything is a plugin',
      introduction: 'Every page, feature, and integration exists as a plugin. Combine only the plugins you need to create a complete ElementsPanel experience.',
    })

useSeoMeta({
  title: 'ElementsPanel',
  description: () => copy.value.description,
})

const productPreview = ref<HTMLElement | null>(null)
let perspectiveFrame: number | null = null

const updatePreviewPerspective = () => {
  perspectiveFrame = null

  if (!productPreview.value) return

  const scrollRange = Math.max(window.innerHeight * 0.7, 420)
  const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1)
  productPreview.value.style.setProperty('--preview-tilt', `${progress * -10}deg`)
}

const queuePreviewPerspective = () => {
  if (perspectiveFrame !== null) return
  perspectiveFrame = window.requestAnimationFrame(updatePreviewPerspective)
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  updatePreviewPerspective()
  window.addEventListener('scroll', queuePreviewPerspective, { passive: true })
  window.addEventListener('resize', queuePreviewPerspective, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', queuePreviewPerspective)
  window.removeEventListener('resize', queuePreviewPerspective)

  if (perspectiveFrame !== null) {
    window.cancelAnimationFrame(perspectiveFrame)
  }
})
</script>

<template>
  <section class="hero">
    <div class="site-container hero-inner">
      <div class="hero-heading">
        <h1>ElementsPanel</h1>
      </div>

      <div ref="productPreview" class="product-preview">
        <img
          class="product-screenshot"
          src="/images/elements-panel-dashboard.png"
          :alt="copy.screenshotAlt"
          width="1920"
          height="1080"
          fetchpriority="high"
        >
      </div>
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
</template>
