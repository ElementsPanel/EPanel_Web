<script setup lang="ts">
const props = defineProps<{
  toc: DocsTocEntry[]
  label: string
}>()

const route = useRoute()
const activeId = ref('')
let headings: HTMLElement[] = []
let frame: number | null = null
let resizeObserver: ResizeObserver | undefined

function updateActiveHeading() {
  frame = null
  let current = headings[0]

  // 与正文标题的 scroll-margin-top 保持一致，避开固定顶栏。
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > 97) break
    current = heading
  }

  // 页面底部的短分节可能无法滚到顶栏下方，也需要能够高亮。
  if (window.scrollY > 0
    && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    current = headings.at(-1)
  }

  activeId.value = current?.id ?? ''
}

function scheduleUpdate() {
  if (frame === null) frame = requestAnimationFrame(updateActiveHeading)
}

function refreshHeadings() {
  headings = props.toc
    .map(entry => document.getElementById(entry.id))
    .filter((heading): heading is HTMLElement => Boolean(heading?.closest('.doc-body')))

  resizeObserver?.disconnect()
  const article = headings[0]?.closest('.docs-article')
  if (article) resizeObserver?.observe(article)
  scheduleUpdate()
}

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleUpdate)
  watch(() => [props.toc, route.path], refreshHeadings, { immediate: true, flush: 'post' })
  watch(() => route.hash, scheduleUpdate, { flush: 'post' })
  window.addEventListener('scroll', scheduleUpdate, { passive: true })
  window.addEventListener('resize', scheduleUpdate)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleUpdate)
  window.removeEventListener('resize', scheduleUpdate)
  resizeObserver?.disconnect()
  if (frame !== null) cancelAnimationFrame(frame)
})
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
      :active="activeId === entry.id"
      :aria-current="activeId === entry.id ? 'location' : undefined"
      :style="{ paddingInlineStart: `${12 + Math.max(0, entry.depth - 2) * 12}px` }"
    />
  </v-list>
</template>
