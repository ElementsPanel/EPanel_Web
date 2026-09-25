import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    // Nuxt 使用 SSR，Vue 无法自动探测，必须显式开启
    ssr: true,
    defaults: {
      VBtn: {
        rounded: 'xl',
      },
    },
    theme: {
      // Vuetify 4 的默认值是 'system'，会跟随系统深色模式
      defaultTheme: 'light',
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
