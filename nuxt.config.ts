import vuetify from 'vite-plugin-vuetify'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  build: {
    transpile: ['vuetify'],
  },
  vite: {
    plugins: [
      // vite-plugin-vuetify 的插件类型与 Nuxt 的 Vite 插件类型不完全兼容
      // @ts-expect-error
      vuetify({ autoImport: true }),
    ],
  },
})
