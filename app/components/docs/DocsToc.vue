<script setup lang="ts">
defineProps<{
  toc: DocsTocEntry[]
  label: string
}>()

const route = useRoute()
</script>

<template>
  <v-list
    v-if="toc.length > 0"
    class="docs-toc"
    :aria-label="label"
    tag="nav"
    color="primary"
    bg-color="transparent"
    density="compact"
    nav
  >
    <v-list-subheader>{{ label }}</v-list-subheader>
    <v-list-item
      v-for="entry in toc"
      :key="entry.id"
      :title="entry.text"
      :to="{ path: route.path, query: route.query, hash: `#${entry.id}` }"
      :active="route.hash === `#${entry.id}`"
      :style="{ paddingInlineStart: `${12 + Math.max(0, entry.depth - 2) * 12}px` }"
    />
  </v-list>
</template>
