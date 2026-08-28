<script setup lang="ts">
useSeoMeta({
  title: 'ElementsPanel',
  description: 'ElementsPanel 官方网站',
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
          alt="ElementsPanel 应用实例管理界面"
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
        <p class="section-label">PLUGIN ARCHITECTURE</p>
        <h2>一切皆插件</h2>
        <p class="plugin-description">
          每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。
        </p>
      </div>

      <div class="plugin-grid" aria-label="ElementsPanel 插件组成">
        <div class="plugin-item">
          <span class="plugin-number">01</span>
          <strong>界面插件</strong>
          <span>定义页面与交互</span>
        </div>
        <div class="plugin-item">
          <span class="plugin-number">02</span>
          <strong>功能插件</strong>
          <span>提供独立能力</span>
        </div>
        <div class="plugin-item">
          <span class="plugin-number">03</span>
          <strong>数据插件</strong>
          <span>连接数据与服务</span>
        </div>
        <div class="plugin-item">
          <span class="plugin-number">04</span>
          <strong>扩展插件</strong>
          <span>组合新的工作流</span>
        </div>
      </div>
    </div>
  </section>
</template>
