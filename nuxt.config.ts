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
    server: {
      watch: {
        // .data/wiki 由后端定时拉取改写，不要让这些文件触发热更新
        ignored: ['**/.data/**'],
      },
    },
  },

  // 文档来自 GitHub Wiki，在服务端拉取并缓存。
  // 全部为私有配置，不会下发到浏览器；可用 NUXT_WIKI_* 环境变量覆盖。
  runtimeConfig: {
    wiki: {
      repo: 'https://github.com/ElementsPanel/ElementsPanel.wiki.git',
      branch: 'master',
      // 相对项目根目录，已在 .gitignore 中忽略
      dir: '.data/wiki',
      // 定时拉取间隔（毫秒）
      syncInterval: 15 * 60 * 1000,
    },
  },

  nitro: {
    storage: {
      // 文档专用缓存挂载点，读取方式见 server/utils/docs/store.ts
      docs: {
        driver: 'memory',
      },
    },
  },
})
