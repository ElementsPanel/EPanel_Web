<script setup lang="ts">
// key: false keeps a static page key so switching docs reuses the same instance,
// skipping the page transition and remount; DocsView fades its own content instead
definePageMeta({ key: false })
</script>

<template>
  <DocsView />
</template>
