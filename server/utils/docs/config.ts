import { resolve } from 'node:path'

export interface DocsConfig {
  /** 远端 wiki 仓库地址 */
  repo: string
  /** 远端分支 */
  branch: string
  /** 本地镜像目录绝对路径 */
  dir: string
  /** 定时拉取间隔（毫秒） */
  syncInterval: number
}

export function getDocsConfig(): DocsConfig {
  const { wiki } = useRuntimeConfig()

  return {
    repo: String(wiki.repo),
    branch: String(wiki.branch),
    dir: resolve(process.cwd(), String(wiki.dir)),
    syncInterval: Number(wiki.syncInterval),
  }
}

/**
 * 从 `https://github.com/OWNER/REPO.wiki.git`（或 SSH 形式）解析出
 * GitHub Wiki 的网页地址，用于生成「在 GitHub 上编辑」链接。
 */
export function getWikiWebBase(repo: string): string | null {
  const raw = repo.trim()
  const ssh = /^git@([^:]+):(.+)$/.exec(raw)

  let host = ''
  let path = ''
  if (ssh) {
    host = ssh[1]!
    path = ssh[2]!
  }
  else {
    try {
      const url = new URL(raw)
      host = url.host
      path = url.pathname.replace(/^\//, '')
    }
    catch {
      return null
    }
  }

  const ownerRepo = /^(.+)\.wiki$/.exec(path.replace(/\.git$/, ''))?.[1]
  if (!host || !ownerRepo) return null

  return `https://${host}/${ownerRepo}/wiki`
}
