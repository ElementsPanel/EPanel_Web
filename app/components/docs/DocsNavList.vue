<script setup lang="ts">
import { docsPath } from '#shared/utils/docs'

const props = defineProps<{
  nodes: DocsNavNode[]
  activeSlug: string
  label: string
}>()

interface NavListItem {
  title: string
  value: string
  props?: { to: string, exact: boolean, active: boolean }
  children?: NavListItem[]
}

function toListItems(nodes: DocsNavNode[]): NavListItem[] {
  return nodes.map(node => ({
    title: node.title,
    value: node.slug,
    ...(node.children.length > 0
      ? { children: toListItems(node.children) }
      : { props: { to: docsPath(node.slug), exact: true, active: node.slug === props.activeSlug } }),
  }))
}

const items = computed(() => toListItems(props.nodes))
const opened = ref<string[]>([])

// 打开深链接所属的分组，随后仍可由用户自由折叠。
watch(() => props.activeSlug, (slug) => {
  const parts = slug.split('/')
  opened.value = parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
}, { immediate: true })
</script>

<template>
  <!-- Vuetify 根据 children 递归生成 v-list-group / v-list-item。 -->
  <v-list
    v-model:opened="opened"
    class="docs-nav-list"
    :items="items"
    :aria-label="label"
    tag="nav"
    color="primary"
    bg-color="transparent"
    density="compact"
    open-strategy="multiple"
    nav
    slim
  />
</template>
