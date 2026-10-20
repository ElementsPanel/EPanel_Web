<script setup lang="ts">
// key: false 使用静态页面 key，文档间切换时复用同一页面实例，
// 避免触发整页过渡与组件重挂载；文档内容直接原地更新，无过渡动画
definePageMeta({ key: false })
</script>

<template>
  <DocsView />
</template>
