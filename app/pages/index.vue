<script setup lang="ts">
const { language } = useSiteLanguage()

const copy = computed(() => language.value === 'zh'
  ? {
      description: 'ElementsPanel 官方网站',
      screenshotAlt: 'ElementsPanel 应用实例管理界面',
      architecture: '插件架构',
      heading: '一切皆插件',
      introduction: '每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。',
      gridAria: 'ElementsPanel 插件组成',
      plugins: [
        { title: '界面插件', description: '定义页面与交互' },
        { title: '功能插件', description: '提供独立能力' },
        { title: '数据插件', description: '连接数据与服务' },
        { title: '扩展插件', description: '组合新的工作流' },
      ],
    }
  : {
      description: 'The official ElementsPanel website',
      screenshotAlt: 'ElementsPanel application instance management interface',
      architecture: 'PLUGIN ARCHITECTURE',
      heading: 'Everything is a plugin',
      introduction: 'Every page, feature, and integration exists as a plugin. Combine only the plugins you need to create a complete ElementsPanel experience.',
      gridAria: 'ElementsPanel plugin architecture',
      plugins: [
        { title: 'Interface plugins', description: 'Define pages and interactions' },
        { title: 'Feature plugins', description: 'Provide focused capabilities' },
        { title: 'Data plugins', description: 'Connect data and services' },
        { title: 'Extension plugins', description: 'Compose new workflows' },
      ],
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
      <div class="plugin-intro">
        <p class="section-label">{{ copy.architecture }}</p>
        <h2>{{ copy.heading }}</h2>
        <p class="plugin-description">{{ copy.introduction }}</p>
      </div>

      <div class="plugin-grid" :aria-label="copy.gridAria">
        <div v-for="(plugin, index) in copy.plugins" :key="plugin.title" class="plugin-item">
          <span class="plugin-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ plugin.title }}</strong>
          <span>{{ plugin.description }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
