import { getDocsConfig } from '../utils/docs/config'
import { invalidateDocsCache } from '../utils/docs/store'
import { syncWiki } from '../utils/docs/sync'

// Runs on every server restart in production, and again when nitro restarts in
// dev, so a global flag prevents the timer from being registered twice.
const TIMER_KEY = Symbol.for('epanel.docs.syncTimer')

interface TimerRegistry {
  [TIMER_KEY]?: NodeJS.Timeout
}

const registry = globalThis as unknown as TimerRegistry

async function refreshDocs(): Promise<void> {
  try {
    const result = await syncWiki()

    if (result.updated) {
      await invalidateDocsCache()
      console.info(`[docs] 检测到新提交 ${result.head.slice(0, 8)}，已刷新文档缓存`)
    }
  }
  catch (error) {
    console.error(
      '[docs] 拉取文档失败：',
      (error as Error).message,
    )
  }
}

export default defineNitroPlugin((nitroApp) => {
  const { syncInterval, repo } = getDocsConfig()

  // Warm up on boot so the repo is already local before the first request
  void refreshDocs()

  // Drop the timer left behind by the previous load when HMR reloads this plugin
  clearInterval(registry[TIMER_KEY])

  const timer = setInterval(() => {
    void refreshDocs()
  }, syncInterval)

  // Do not keep the process alive
  timer.unref?.()
  registry[TIMER_KEY] = timer

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
    clearInterval(registry[TIMER_KEY])
  })

  console.info(`[docs] 文档同步已启动：${repo}，间隔 ${Math.round(syncInterval / 1000)}s`)
})
