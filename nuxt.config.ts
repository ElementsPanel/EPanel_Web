import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
  },
  build: {
    transpile: ['vuetify'],
  },
  vite: {
    plugins: [
      // vite-plugin-vuetify's plugin type is not fully compatible with Nuxt's Vite plugin type
      // @ts-expect-error
      vuetify({ autoImport: true }),
    ],
    server: {
      watch: {
        // .data/wiki is rewritten by the scheduled sync; keep it out of HMR
        ignored: ['**/.data/**'],
      },
    },
  },

  // Docs live in a GitHub Wiki, fetched and cached server-side.
  // All values are private (never shipped to the browser); override with NUXT_WIKI_* env vars.
  runtimeConfig: {
    wiki: {
      repo: 'https://github.com/ElementsPanel/ElementsPanel.wiki.git',
      branch: 'master',
      // Relative to the project root, ignored by .gitignore
      dir: '.data/wiki',
      // Sync interval in milliseconds
      syncInterval: 15 * 60 * 1000,
    },
  },

  nitro: {
    storage: {
      // Dedicated cache mount for docs; see server/utils/docs/store.ts
      docs: {
        driver: 'memory',
      },
    },
  },
})
