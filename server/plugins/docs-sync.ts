import { getDocsConfig } from '../utils/docs/config'
import { invalidateDocsCache } from '../utils/docs/store'
import { syncWiki } from '../utils/docs/sync'

// 生产环境每次 server 重启都会执行；dev 下 nitro 重启也会重新执行，
// 因此用全局标记避免重复注册定时器。
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

  // 启动时预热：首次请求到来前就已经拉到本地
  void refreshDocs()

  // HMR 重新加载本插件时，先停掉上一轮遗留的定时器
  clearInterval(registry[TIMER_KEY])

  const timer = setInterval(() => {
    void refreshDocs()
  }, syncInterval)

  // 不阻止进程退出
  timer.unref?.()
  registry[TIMER_KEY] = timer

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
    clearInterval(registry[TIMER_KEY])
  })

  console.info(`[docs] 文档同步已启动：${repo}，间隔 ${Math.round(syncInterval / 1000)}s`)
})
