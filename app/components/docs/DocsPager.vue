<script setup lang="ts">
defineProps<{
  prev: DocsPageMeta | null
  next: DocsPageMeta | null
}>()

function hrefFor(meta: DocsPageMeta): string {
  return meta.slug === '' ? '/docs' : `/docs/${meta.slug}`
}
</script>

<template>
  <nav v-if="prev || next" class="docs-pager" aria-label="文档上下篇">
    <NuxtLink v-if="prev" class="docs-pager-link" :to="hrefFor(prev)">
      <span class="docs-pager-label">上一篇</span>
      <span class="docs-pager-title">{{ prev.title }}</span>
    </NuxtLink>
    <span v-else class="docs-pager-spacer" />

    <NuxtLink v-if="next" class="docs-pager-link is-next" :to="hrefFor(next)">
      <span class="docs-pager-label">下一篇</span>
      <span class="docs-pager-title">{{ next.title }}</span>
    </NuxtLink>
  </nav>
</template>
