<script setup lang="ts">
useSeoMeta({
  title: 'EPanel',
  description: 'EPanel 官方网站',
})
</script>

<template>
  <section class="hero">
    <div class="site-container hero-inner">
      <div class="hero-heading">
        <h1>EPanel</h1>
      </div>

      <div class="product-preview" aria-label="EPanel 程序界面预览">
        <!-- 提供正式截图后，用 img.product-screenshot 替换 preview-placeholder。 -->
        <div class="preview-placeholder" aria-hidden="true">
          <div class="preview-sidebar">
            <span class="preview-logo"></span>
            <span v-for="item in 6" :key="item" class="preview-nav-item"></span>
          </div>
          <div class="preview-content">
            <div class="preview-toolbar">
              <span class="preview-title-line"></span>
              <span class="preview-action"></span>
            </div>
            <div class="preview-metrics">
              <span v-for="item in 3" :key="item" class="preview-metric"></span>
            </div>
            <div class="preview-chart">
              <span class="chart-grid"></span>
              <span class="chart-line"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
