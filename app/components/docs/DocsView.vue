<script setup lang="ts">
const route = useRoute()

const slug = computed(() => {
  const raw = route.params.slug
  const parts = Array.isArray(raw) ? raw : [raw]

  return parts
    .filter((part): part is string => Boolean(part))
    .join('/')
})

const { data: treeData } = await useFetch<DocsTreeResponse>('/api/docs/tree')

const { data: page } = await useFetch<DocsPage | null>(
  () => `/api/docs/page?slug=${encodeURIComponent(slug.value)}`,
  { watch: [slug] },
)

// markdown-it 以 html: false 渲染，原始 HTML 已被转义，这里的 v-html 是安全的
useSeoMeta({
  title: () => (page.value ? `${page.value.title} · ElementsPanel 文档` : '文档 · ElementsPanel'),
  description: 'ElementsPanel 官方文档',
})

// 服务端与浏览器时区不同会导致 hydration 不一致，统一按 UTC 输出日期
function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
</script>

<template>
  <div class="docs">
    <div class="site-container docs-shell">
      <aside class="docs-sidebar" aria-label="文档导航">
        <DocsNavList v-if="treeData && treeData.tree.length > 0" :nodes="treeData.tree" />
        <p v-else class="docs-sidebar-empty">暂无可用文档</p>
      </aside>

      <div class="docs-main">
        <article v-if="page" class="docs-article">
          <header class="docs-header">
            <h1 class="docs-title">{{ page.title }}</h1>

            <div class="docs-meta">
              <span v-if="formatUpdatedAt(page.updatedAt)" class="docs-updated">
                更新于 {{ formatUpdatedAt(page.updatedAt) }}
              </span>
              <a
                v-if="page.editUrl"
                class="docs-edit-link"
                :href="page.editUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                在 GitHub 上编辑
              </a>
            </div>
          </header>

          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="doc-body" v-html="page.html" />

          <DocsPager :prev="page.prev" :next="page.next" />
        </article>

        <div v-else class="docs-empty">
          <h1>文档暂未加载</h1>
          <p>尚未从 GitHub Wiki 拉取到该文档，请稍后再试。</p>
        </div>
      </div>

      <DocsToc v-if="page && page.toc.length > 0" :toc="page.toc" />
    </div>
  </div>
</template>
