<script setup lang="ts">
// 递归渲染导航树，显式自引用保证在任何解析模式下都能找到组件
import DocsNavList from './DocsNavList.vue'

const props = defineProps<{
  nodes: DocsNavNode[]
}>()

const route = useRoute()

function hrefFor(slug: string): string {
  return slug === '' ? '/docs' : `/docs/${slug}`
}

// 前缀匹配会让 /docs 在子页面上也高亮，这里按完整路径精确判断
function isActive(slug: string): boolean {
  return route.path.replace(/\/$/, '') === hrefFor(slug)
}
</script>

<template>
  <ul class="docs-nav-list">
    <li v-for="node in props.nodes" :key="node.slug" class="docs-nav-item">
      <template v-if="node.children.length > 0">
        <span class="docs-nav-group">{{ node.title }}</span>
        <DocsNavList :nodes="node.children" />
      </template>

      <NuxtLink
        v-else
        class="docs-nav-link"
        :class="{ 'is-active': isActive(node.slug) }"
        :to="hrefFor(node.slug)"
      >
        {{ node.title }}
      </NuxtLink>
    </li>
  </ul>
</template>
