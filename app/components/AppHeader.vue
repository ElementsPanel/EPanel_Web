<template>
  <v-app-bar class="site-header" scroll-behavior="elevate">
    <div class="site-container header-inner">
      <NuxtLink class="brand" to="/" aria-label="ElementsPanel 首页">
        <v-avatar color="primary" rounded="lg" size="32">
          <span class="brand-mark-letter">E</span>
        </v-avatar>
        <span class="brand-title text-title-large">ElementsPanel</span>
      </NuxtLink>

      <nav class="header-nav" aria-label="主导航">
        <v-btn to="/" variant="text">首页</v-btn>
      </nav>
    </div>
  </v-app-bar>
</template>
