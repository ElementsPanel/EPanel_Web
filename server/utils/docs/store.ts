import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getDocsLanguage } from '../../../shared/utils/docs'
import { getDocsConfig, getWikiWebBase, type DocsConfig } from './config'
import { renderDoc } from './render'
import { buildNavTree, extractTitle, flattenTree, getDocFormat, readWikiEntries, stripDocExtension } from './source'
import { ensureRepoReady, readHead, readHeadDate } from './sync'

export interface DocsSnapshot {
  head: string
  updatedAt: string
  tree: DocsNavNode[]
  /** Depth-first reading order */
  pages: DocsPageMeta[]
  /** Repo file path (lowercase, no extension) → slug, used for link rewriting */
  slugByFile: Record<string, string>
}

const SNAPSHOT_KEY = 'snapshot'

// Page cache keys carry the head, so a new commit invalidates old keys and a
// still-rendering previous version cannot backfill them
const pageKey = (head: string, slug: string) => `page:${head}:${slug}`

// useStorage needs nitro to be ready; create it lazily on first use
let cache: ReturnType<typeof useStorage> | null = null

function docsCache() {
  cache ??= useStorage('docs')
  return cache
}

/** Clear the docs cache after a new commit so the next request rebuilds */
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

// Concurrent requests may all start a build; one promise parses it only once
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

/** Build the "Edit on GitHub" link; null when the repo URL cannot be parsed */
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

  // Reading order stays within the current language, so the last page never jumps to the other one.
  const language = getDocsLanguage(meta.slug)
  const localizedPages = snapshot.pages.filter(page => getDocsLanguage(page.slug) === language)
  const localizedIndex = localizedPages.findIndex(page => page.slug === slug)

  const page: DocsPage = {
    slug: meta.slug,
    file: meta.file,
    title: meta.title,
    html,
    toc,
    editUrl: buildEditUrl(meta.file, config) ?? '',
    prev: localizedPages[localizedIndex - 1] ?? null,
    next: localizedPages[localizedIndex + 1] ?? null,
    updatedAt: snapshot.updatedAt,
  }

  await docsCache().setItem(key, page)

  return page
}
