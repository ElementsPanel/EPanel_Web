<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="site-container footer-inner">
      <NuxtLink class="brand footer-brand" to="/" aria-label="EPanel 首页">
        <span class="brand-mark" aria-hidden="true">E</span>
        <span>EPanel</span>
      </NuxtLink>
      <p class="footer-copy">© {{ currentYear }} EPanel. All rights reserved.</p>
    </div>
  </footer>
</template>
