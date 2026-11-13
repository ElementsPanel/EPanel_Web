import { resolve } from 'node:path'

export interface DocsConfig {
  /** Remote wiki repository URL */
  repo: string
  branch: string
  /** Absolute path of the local mirror directory */
  dir: string
  /** Sync interval in milliseconds */
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
 * Parses `https://github.com/OWNER/REPO.wiki.git` (or the SSH form) into the
 * GitHub Wiki web URL used for the "Edit on GitHub" link.
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
