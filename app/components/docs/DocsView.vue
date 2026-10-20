<script setup lang="ts">
import { docsPath, getDocsLanguage, getLocalizedDocsSlug, getLocalizedDocsTree, isDocsLanguage } from '#shared/utils/docs'

const route = useRoute()
const { language, setLanguage } = useSiteLanguage()

const slug = computed(() => {
  const raw = route.params.slug
  const parts = Array.isArray(raw) ? raw : [raw]

  return parts
    .filter((part): part is string => Boolean(part))
    .join('/')
})

const labels = computed(() => language.value === 'zh'
  ? {
      documentation: '文档',
      description: 'ElementsPanel 官方文档',
      navigation: '文档导航',
      noDocuments: '暂无可用文档',
      updated: '更新于',
      edit: '在 GitHub 上编辑',
      toc: '本页内容',
      pager: '文档上下篇',
      previous: '上一篇',
      next: '下一篇',
      unavailable: '文档暂未加载',
      unavailableDescription: '尚未从 GitHub Wiki 拉取到该文档，请稍后再试。',
    }
  : {
      documentation: 'Documentation',
      description: 'Official ElementsPanel documentation',
      navigation: 'Documentation navigation',
      noDocuments: 'No documentation available',
      updated: 'Updated on',
      edit: 'Edit on GitHub',
      toc: 'On this page',
      pager: 'Document pagination',
      previous: 'Previous',
      next: 'Next',
      unavailable: 'Documentation unavailable',
      unavailableDescription: 'This page has not been fetched from GitHub Wiki yet. Please try again later.',
    })

const { data: treeData } = await useFetch<DocsTreeResponse>('/api/docs/tree')
const navigation = computed(() => getLocalizedDocsTree(treeData.value?.tree ?? [], language.value))
const pageSlug = computed(() => {
  const routeLanguage = getDocsLanguage(slug.value)

  if (slug.value === '' || isDocsLanguage(slug.value)) {
    return getLocalizedDocsSlug('', language.value, treeData.value?.tree ?? [])
  }

  return routeLanguage === language.value
    ? slug.value
    : getLocalizedDocsSlug(slug.value, language.value, treeData.value?.tree ?? [])
})

const { data: page } = await useFetch<DocsPage | null>(
  () => `/api/docs/page?slug=${encodeURIComponent(pageSlug.value)}`,
)

// 浏览器前进/后退到另一种语言的深链时，同步全站语言。
watch(slug, (value) => {
  const routeLanguage = getDocsLanguage(value)
  if (routeLanguage && routeLanguage !== language.value) {
    setLanguage(routeLanguage)
  }
}, { immediate: true, flush: 'sync' })

// 顶栏切换语言时，尽量跳到当前文档的对应译文。
watch(language, async (value) => {
  if (getDocsLanguage(slug.value) === value) return

  const target = getLocalizedDocsSlug(pageSlug.value, value, treeData.value?.tree ?? [])
  // 译文的标题锚点可能不同，切换时从新页面顶部开始阅读。
  await navigateTo(docsPath(target))
})

useSeoMeta({
  title: () => (page.value
    ? `${page.value.title} · ElementsPanel ${labels.value.documentation}`
    : `${labels.value.documentation} · ElementsPanel`),
  description: () => labels.value.description,
})

// 服务端与浏览器时区不同会导致 hydration 不一致，统一按 UTC 输出日期
function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
</script>

<template>
  <div class="docs" :lang="language === 'zh' ? 'zh-CN' : 'en'">
    <div class="site-container docs-shell">
      <aside class="docs-sidebar" :aria-label="labels.navigation">
        <DocsNavList
          v-if="navigation.length > 0"
          :nodes="navigation"
          :active-slug="pageSlug"
          :label="labels.navigation"
        />
        <p v-else class="docs-sidebar-empty">{{ labels.noDocuments }}</p>
      </aside>

      <div class="docs-main">
        <article v-if="page" class="docs-article">
          <header class="docs-header">
            <h1 class="docs-title">{{ page.title }}</h1>

            <div class="docs-meta">
              <span v-if="formatUpdatedAt(page.updatedAt)" class="docs-updated">
                {{ labels.updated }} {{ formatUpdatedAt(page.updatedAt) }}
              </span>
              <a
                v-if="page.editUrl"
                class="docs-edit-link"
                :href="page.editUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ labels.edit }}
              </a>
            </div>
          </header>

          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="doc-body" v-html="page.html" />

          <DocsPager
            :prev="page.prev"
            :next="page.next"
            :label="labels.pager"
            :previous-label="labels.previous"
            :next-label="labels.next"
          />
        </article>

        <div v-else class="docs-empty">
          <h1>{{ labels.unavailable }}</h1>
          <p>{{ labels.unavailableDescription }}</p>
        </div>
      </div>

      <DocsToc v-if="page && page.toc.length > 0" :toc="page.toc" :label="labels.toc" />
    </div>
  </div>
</template>
