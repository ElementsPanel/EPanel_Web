<script setup lang="ts">
import { docsPath } from '#shared/utils/docs'

defineProps<{
  prev: DocsPageMeta | null
  next: DocsPageMeta | null
  label: string
  previousLabel: string
  nextLabel: string
}>()
</script>

<template>
  <nav v-if="prev || next" class="docs-pager" :aria-label="label">
    <NuxtLink v-if="prev" class="docs-pager-link" :to="docsPath(prev.slug)">
      <span class="docs-pager-label">{{ previousLabel }}</span>
      <span class="docs-pager-title">{{ prev.title }}</span>
    </NuxtLink>
    <span v-else class="docs-pager-spacer" />

    <NuxtLink v-if="next" class="docs-pager-link is-next" :to="docsPath(next.slug)">
      <span class="docs-pager-label">{{ nextLabel }}</span>
      <span class="docs-pager-title">{{ next.title }}</span>
    </NuxtLink>
  </nav>
</template>
