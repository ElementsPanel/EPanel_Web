import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDocsConfig, getWikiWebBase, type DocsConfig } from './config'
import { renderDoc } from './render'
import { buildNavTree, extractTitle, flattenTree, getDocFormat, readWikiEntries, stripDocExtension } from './source'
import { ensureRepoReady, readHead, readHeadDate } from './sync'

export interface DocsSnapshot {
  head: string
  updatedAt: string
  tree: DocsNavNode[]
  /** 深度优先的阅读顺序 */
  pages: DocsPageMeta[]
  /** 仓库文件路径（小写、无扩展名）→ slug，供链接重写使用 */
  slugByFile: Record<string, string>
}

const SNAPSHOT_KEY = 'snapshot'

// 页面缓存带上 head：拉取到新提交后旧 key 自然失效，
// 不会被上一版本尚未渲染完的结果回填
const pageKey = (head: string, slug: string) => `page:${head}:${slug}`

// useStorage 需要在 nitro 就绪后调用，这里延迟到首次使用时再创建
let cache: ReturnType<typeof useStorage> | null = null

function docsCache() {
  cache ??= useStorage('docs')
  return cache
}

/** 拉取到新提交后清空文档缓存，下一次请求重新构建 */
export async function invalidateDocsCache(): Promise<void> {
  await docsCache().clear()
}

async function buildSnapshot(): Promise<DocsSnapshot> {
  const config = getDocsConfig()
  const entries = await readWikiEntries(config)

  const tree = buildNavTree(entries)
  const pages: DocsPageMeta[] = flattenTree(tree).map(node => ({
    slug: node.slug,
    title: node.title,
    file: node.file,
  }))

  const slugByFile: Record<string, string> = {}
  for (const entry of entries) {
    slugByFile[stripDocExtension(entry.file).toLowerCase()] = entry.slug
  }

  return {
    head: await readHead(config) ?? '',
    updatedAt: await readHeadDate(config) ?? new Date().toISOString(),
    tree,
    pages,
    slugByFile,
  }
}

// 并发请求可能同时进入构建，共用同一个 Promise 保证只解析一次
let snapshotInFlight: Promise<DocsSnapshot> | null = null

export async function getDocsSnapshot(): Promise<DocsSnapshot> {
  const cached = await docsCache().getItem<DocsSnapshot>(SNAPSHOT_KEY)
  if (cached) return cached

  await ensureRepoReady()

  snapshotInFlight ??= buildSnapshot().finally(() => {
    snapshotInFlight = null
  })

  const snapshot = await snapshotInFlight
  await docsCache().setItem(SNAPSHOT_KEY, snapshot)

  return snapshot
}

/** 生成「在 GitHub 上编辑」链接；仓库地址无法解析时返回 null */
function buildEditUrl(file: string, config: DocsConfig): string | null {
  const webBase = getWikiWebBase(config.repo)
  if (!webBase) return null

  const pageName = stripDocExtension(file).split('/').map(encodeURIComponent).join('/')
  return `${webBase}/${pageName}/_edit`
}

export async function getDocPage(slug: string): Promise<DocsPage | null> {
  const snapshot = await getDocsSnapshot()

  const index = snapshot.pages.findIndex(page => page.slug === slug)
  if (index === -1) return null

  const key = pageKey(snapshot.head, slug)
  const cached = await docsCache().getItem<DocsPage>(key)
  if (cached) return cached

  const meta = snapshot.pages[index]!
  const format = getDocFormat(meta.file)
  if (!format) return null

  const config = getDocsConfig()
  const raw = await readFile(join(config.dir, meta.file), 'utf8')
  const { body } = extractTitle(raw, format)
  const { html, toc } = await renderDoc(body, format, {
    currentFile: meta.file,
    slugByFile: snapshot.slugByFile,
  })

  const page: DocsPage = {
    slug: meta.slug,
    file: meta.file,
    title: meta.title,
    html,
    toc,
    editUrl: buildEditUrl(meta.file, config) ?? '',
    prev: snapshot.pages[index - 1] ?? null,
    next: snapshot.pages[index + 1] ?? null,
    updatedAt: snapshot.updatedAt,
  }

  await docsCache().setItem(key, page)

  return page
}
