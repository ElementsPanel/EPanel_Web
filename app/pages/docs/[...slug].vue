<script setup lang="ts">
// key: false 使用静态页面 key，文档间切换时复用同一页面实例，
// 避免触发整页过渡与组件重挂载；内容区的加载淡出由 DocsView 自己处理
definePageMeta({ key: false })
</script>

<template>
  <DocsView />
</template>
