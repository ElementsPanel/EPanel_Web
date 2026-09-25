import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { DocsConfig } from './config'

/**
 * GitHub wiki 允许同一个仓库里混用多种标记语言，
 * 因此支持的扩展名按格式归类。
 */
export type DocFormat = 'markdown' | 'asciidoc'

const DOC_EXTENSIONS: Record<string, DocFormat> = {
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
  '.mkdn': 'markdown',
  '.adoc': 'asciidoc',
  '.asciidoc': 'asciidoc',
  '.asc': 'asciidoc',
}

/** GitHub wiki 的保留文件，不作为文档页面 */
function isReserved(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

/** 判断文件是否属于支持的文档格式 */
export function getDocFormat(file: string): DocFormat | null {
  const dot = file.lastIndexOf('.')
  if (dot === -1) return null

  return DOC_EXTENSIONS[file.slice(dot).toLowerCase()] ?? null
}

/** 去掉文档扩展名，非文档文件原样返回 */
export function stripDocExtension(file: string): string {
  if (!getDocFormat(file)) return file

  return file.slice(0, file.lastIndexOf('.'))
}

/** 位于根目录的 Home.* 对应文档首页 */
function isHomeRoot(file: string): boolean {
  if (getDocFormat(file) === null) return false
  if (file.includes('/')) return false

  return stripDocExtension(file).toLowerCase() === 'home'
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

  return stripDocExtension(file)
    .split('/')
    .map(slugifySegment)
    .join('/')
}

/** 去掉可能存在 YAML frontmatter（Markdown 专有） */
function stripFrontmatter(source: string): string {
  const content = source.charCodeAt(0) === 0xFEFF ? source.slice(1) : source
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/**
 * 取出正文首个一级标题作为标题，并把它从正文中移除，
 * 由页面单独渲染标题，避免重复。
 * Markdown 是 `# 标题`，AsciiDoc 是 `= 标题`。
 */
export function extractTitle(source: string, format: DocFormat): { title: string | null, body: string } {
  const lines = (format === 'markdown' ? stripFrontmatter(source) : source).split(/\r?\n/)
  const pattern = format === 'asciidoc' ? /^=\s+(.+?)\s*$/ : /^#\s+(.+?)\s*#*$/

  let title: string | null = null
  let titleIndex = -1

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()

    // 空行，以及 AsciiDoc 开头的属性行与注释，都不算作正文首行
    if (trimmed === '') continue
    if (format === 'asciidoc' && (trimmed.startsWith(':') || trimmed.startsWith('//'))) continue

    const heading = pattern.exec(line)
    if (heading) {
      title = heading[1]!.trim()
      titleIndex = index
    }

    // 只有首个有效行可能是文档标题，之后不再寻找
    break
  }

  // 只摘掉标题行本身，其余内容（含 AsciiDoc 属性行）原样保留
  const body = titleIndex === -1
    ? lines.join('\n')
    : [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)].join('\n')

  return { title, body }
}

/**
 * 读取文档显式声明的导航顺序。
 * Markdown 使用 YAML frontmatter，AsciiDoc 使用文档属性。
 */
export function extractNavOrder(source: string, format: DocFormat): number | undefined {
  const content = source.charCodeAt(0) === 0xFEFF ? source.slice(1) : source
  const metadata = format === 'markdown'
    ? /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)?.[1] ?? ''
    : content
  const pattern = format === 'markdown'
    ? /^(?:nav[-_]order|page[-_]order|order)\s*:\s*["']?(\d+)["']?\s*$/im
    : /^:(?:nav-order|page-order|order):\s*(\d+)\s*$/im
  const value = Number(pattern.exec(metadata)?.[1])

  return Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

/** 标题缺失时的兜底：`getting-started` → `Getting started` */
export function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words === '' ? name : words.replace(/^\w/, char => char.toUpperCase())
}

/** 递归收集受支持的文档文件，忽略 `_` 前缀目录/文件与隐藏目录 */
export async function collectDocFiles(root: string): Promise<string[]> {
  const files: string[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (isReserved(entry.name)) continue

      if (entry.isDirectory()) {
        await walk(join(dir, entry.name))
      }
      else if (entry.isFile() && getDocFormat(entry.name) !== null) {
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
  order?: number
  format: DocFormat
}

/** 扫描克隆目录，产出带标题的文档清单 */
export async function readWikiEntries(config: DocsConfig): Promise<DocsSourceEntry[]> {
  const files = await collectDocFiles(config.dir)
  const entries: DocsSourceEntry[] = []

  for (const file of files) {
    const format = getDocFormat(file)
    if (!format) continue

    const raw = await readFile(join(config.dir, file), 'utf8')
    const { title } = extractTitle(raw, format)
    const fallback = humanize(stripDocExtension(file).split('/').pop() ?? file)

    entries.push({
      slug: fileToSlug(file),
      file,
      title: title ?? fallback,
      order: extractNavOrder(raw, format),
      format,
    })
  }

  return entries
}

/** 内容排序：手动顺序优先，未声明时再按目录和标题稳定排序。 */
function compareNodes(a: DocsNavNode, b: DocsNavNode): number {
  const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  if (orderDiff !== 0) return orderDiff

  const aIsFolder = (a.children.length > 0)
  const bIsFolder = (b.children.length > 0)
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1

  return a.title.localeCompare(b.title, 'zh-Hans-CN')
}

/** 由扁平清单构建侧边栏树，同时返回深度优先顺序用于上下篇 */
export function buildNavTree(entries: DocsSourceEntry[]): DocsNavNode[] {
  const root: DocsNavNode[] = []

  for (const entry of entries) {
    // 位于根目录的 Home.* 保留为根级入口。
    if (entry.slug === '') {
      root.push({ slug: '', title: entry.title, order: entry.order, file: entry.file, children: [] })
      continue
    }

    const fileParts = stripDocExtension(entry.file).split('/')
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
          order: entry.order,
          file: isLeaf ? entry.file : '',
          children: [],
        }
        siblings.push(node)
      }
      else if (isLeaf) {
        node.title = entry.title
        node.order = entry.order
      }
      else if (entry.order !== undefined && (node.order === undefined || entry.order < node.order)) {
        // 目录沿用其最早子页顺序，使嵌套导航也能手动排列。
        node.order = entry.order
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
