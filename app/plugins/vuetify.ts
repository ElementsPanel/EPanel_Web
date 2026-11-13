import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    // Nuxt uses SSR; Vue cannot detect that automatically, so enable it explicitly
    ssr: true,
    defaults: {
      VBtn: {
        rounded: 'xl',
      },
    },
    theme: {
      // Vuetify 4 defaults to 'system', which follows the OS dark mode
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: '#2982FF',
            background: '#FAFAFA',
            surface: '#FFFFFF',
          },
        },
      },
    },
  })

  nuxtApp.vueApp.use(vuetify)
})
