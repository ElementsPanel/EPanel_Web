<script setup lang="ts">
defineProps<{
  toc: DocsTocEntry[]
}>()
</script>

<template>
  <nav v-if="toc.length > 0" class="docs-toc" aria-label="本页目录">
    <p class="docs-toc-title">本页内容</p>

    <ul class="docs-toc-list">
      <li v-for="entry in toc" :key="entry.id" :class="`docs-toc-depth-${entry.depth}`">
        <a class="docs-toc-link" :href="`#${entry.id}`">{{ entry.text }}</a>
      </li>
    </ul>
  </nav>
</template>
