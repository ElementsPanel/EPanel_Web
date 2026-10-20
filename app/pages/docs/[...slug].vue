<script setup lang="ts">
// key: false 使用静态页面 key，slug 间切换时复用同一页面实例，
// 不触发整页过渡/重挂载，仅由 DocsView 内的局部 Transition 对内容区做淡入淡出
definePageMeta({ key: false })
</script>

<template>
  <DocsView />
</template>
