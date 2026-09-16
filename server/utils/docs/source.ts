import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { DocsConfig } from './config'

/** GitHub wiki 的保留文件，不作为文档页面 */
function isReserved(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

/** 位于根目录的 Home.md 对应文档首页 */
function isHomeRoot(file: string): boolean {
  return file.toLowerCase() === 'home.md'
}

/**
 * URL 片段：保留 ASCII 字母数字与中日韩字符，其余折叠为连字符。
 * 中文 wiki 的标题需要保留原文，替换成拼音会丢失信息。
 */
export function slugifySegment(segment: string): string {
  const slug = segment
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9一-鿿-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  // 全标点文件名会被清空，退回 URI 编码保证链接不为空
  return slug || encodeURIComponent(segment.trim().toLowerCase())
}

/** 把仓库内的文件路径映射成 /docs 下的访问路径，`Home.md` → '' */
export function fileToSlug(file: string): string {
  if (isHomeRoot(file)) return ''

  return file
    .replace(/\.md$/i, '')
    .split('/')
    .map(slugifySegment)
    .join('/')
}

/** 去掉可能存在 YAML frontmatter */
function stripFrontmatter(source: string): string {
  const content = source.charCodeAt(0) === 0xFEFF ? source.slice(1) : source
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/**
 * 取出正文首行的 H1 作为标题，并把它从正文中移除，
 * 由页面单独渲染标题，避免重复。
 */
export function extractTitle(source: string): { title: string | null, body: string } {
  const lines = stripFrontmatter(source).split(/\r?\n/)
  let consumed = 0

  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') {
      consumed = index + 1
      continue
    }

    const heading = /^#\s+(.+?)\s*#*$/.exec(line)
    consumed = index + 1
    return heading
      ? { title: heading[1]!.trim(), body: lines.slice(consumed).join('\n') }
      : { title: null, body: lines.slice(consumed).join('\n') }
  }

  return { title: null, body: '' }
}

/** 标题缺失时的兜底：`getting-started` → `Getting started` */
export function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words === '' ? name : words.replace(/^\w/, char => char.toUpperCase())
}

/** 递归收集仓库中的 .md 文件，忽略 `_` 前缀目录/文件与隐藏目录 */
export async function collectMarkdownFiles(root: string): Promise<string[]> {
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (isReserved(entry.name)) continue

      if (entry.isDirectory()) {
        await walk(join(dir, entry.name))
      }
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(relative(root, join(dir, entry.name)).split(sep).join('/'))
      }
    }
  }

  await walk(root)
  return files.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

export interface DocsSourceEntry {
  slug: string
  file: string
  title: string
}

/** 扫描克隆目录，产出带标题的文档清单 */
export async function readWikiEntries(config: DocsConfig): Promise<DocsSourceEntry[]> {
  const files = await collectMarkdownFiles(config.dir)
  const entries: DocsSourceEntry[] = []

  for (const file of files) {
    const raw = await readFile(join(config.dir, file), 'utf8')
    const { title } = extractTitle(raw)
    const slug = fileToSlug(file)

    entries.push({
      slug,
      file,
      title: title ?? humanize(file.replace(/\.md$/i, '').split('/').pop() ?? file),
    })
  }

  return entries
}

/** 内容排序：目录在前，其余按标题本地化排序 */
function compareNodes(a: DocsNavNode, b: DocsNavNode): number {
  const aIsFolder = (a.children.length > 0)
  const bIsFolder = (b.children.length > 0)
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1

  return a.title.localeCompare(b.title, 'zh-Hans-CN')
}

/** 由扁平清单构建侧边栏树，同时返回深度优先顺序用于上下篇 */
export function buildNavTree(entries: DocsSourceEntry[]): DocsNavNode[] {
  const root: DocsNavNode[] = []

  for (const entry of entries) {
    // 首页（Home.md）作为根级入口挂在最前
    if (entry.slug === '') {
      root.push({ slug: '', title: entry.title, file: entry.file, children: [] })
      continue
    }

    const fileParts = entry.file.replace(/\.md$/i, '').split('/')
    const slugParts = entry.slug.split('/')
    let siblings = root

    for (let index = 0; index < fileParts.length; index++) {
      const isLeaf = index === fileParts.length - 1
      const nodeSlug = slugParts.slice(0, index + 1).join('/')
      let node = siblings.find(item => item.slug === nodeSlug)

      if (!node) {
        node = {
          slug: nodeSlug,
          title: isLeaf ? entry.title : humanize(fileParts[index]!),
          file: isLeaf ? entry.file : '',
          children: [],
        }
        siblings.push(node)
      }
      else if (isLeaf) {
        node.title = entry.title
      }

      siblings = node.children
    }
  }

  const sortDeep = (nodes: DocsNavNode[]): void => {
    nodes.sort(compareNodes)
    for (const node of nodes) sortDeep(node.children)
  }
  sortDeep(root)

  return root
}

/** 按深度优先展开树，得到线性阅读顺序 */
export function flattenTree(tree: DocsNavNode[]): DocsNavNode[] {
  const flat: DocsNavNode[] = []

  const visit = (nodes: DocsNavNode[]): void => {
    for (const node of nodes) {
      if (node.children.length === 0) flat.push(node)
      else visit(node.children)
    }
  }
  visit(tree)

  return flat
}
