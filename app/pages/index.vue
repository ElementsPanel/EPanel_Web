<script setup lang="ts">
const { language } = useSiteLanguage()

const installCommand = 'npx @elementspanel/init'
const hasCopied = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}

  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  const done = document.execCommand('copy')
  field.remove()
  return done
}

async function copyInstallCommand(): Promise<void> {
  const copied = await writeClipboard(installCommand)
  if (!copied) return

  hasCopied.value = true
  clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    hasCopied.value = false
  }, 1800)
}

onBeforeUnmount(() => clearTimeout(copyResetTimer))

const copy = computed(() => language.value === 'zh'
  ? {
      description: 'ElementsPanel 官方网站',
      heroTitle: '元素面板',
      heroIntroduction: '以插件为核心，让每个页面、功能和集成都能自由组合。',
      installLabel: '复制安装命令',
      installCopied: '已复制安装命令',
      dashboardAlt: 'ElementsPanel 数据监控页面，展示实例、节点与系统资源概览',
      heading: '一切皆插件',
      introduction: '每个页面、每项功能和每个集成都以插件形式存在。插件按需组合，共同构成完整的 ElementsPanel。',
    }
  : {
      description: 'The official ElementsPanel website',
      heroTitle: 'ElementsPanel',
      heroIntroduction: 'Built around plugins. Freely combine every page, feature, and integration.',
      installLabel: 'Copy install command',
      installCopied: 'Install command copied',
      dashboardAlt: 'ElementsPanel dashboard showing instances, nodes, and system resources',
      heading: 'Everything is a plugin',
      introduction: 'Every page, feature, and integration exists as a plugin. Combine only the plugins you need to create a complete ElementsPanel experience.',
    })

useSeoMeta({
  title: 'ElementsPanel',
  description: () => copy.value.description,
})
</script>

<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="site-container hero-copy">
        <h1 id="hero-title">{{ copy.heroTitle }}</h1>
        <p class="hero-description">{{ copy.heroIntroduction }}</p>

        <div class="hero-install">
          <button
            type="button"
            class="install-command"
            :class="{ 'is-copied': hasCopied }"
            :aria-label="copy.installLabel"
            :title="copy.installLabel"
            @click="copyInstallCommand"
          >
            <code class="install-command-text">{{ installCommand }}</code>
            <v-icon
              class="install-command-icon"
              :icon="hasCopied ? 'mdi-check' : 'mdi-content-copy'"
              aria-hidden="true"
            />
          </button>

          <span class="visually-hidden" aria-live="polite">
            {{ hasCopied ? copy.installCopied : '' }}
          </span>
        </div>
      </div>

      <div class="site-container hero-preview">
        <img
          class="hero-dashboard"
          src="/images/elements-panel-dashboard.png"
          :alt="copy.dashboardAlt"
          width="2560"
          height="1519"
          fetchpriority="high"
          decoding="async"
        >
      </div>
    </section>

    <section class="plugin-section">
      <div class="site-container plugin-inner">
        <v-icon
          class="plugin-icon"
          icon="mdi-puzzle-outline"
          aria-hidden="true"
        />

        <div class="plugin-content">
          <h2>{{ copy.heading }}</h2>
          <p class="plugin-description">{{ copy.introduction }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
