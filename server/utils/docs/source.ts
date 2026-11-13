import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { DocsConfig } from './config'

/**
 * A GitHub wiki may mix several markup languages in one repo,
 * so supported extensions are grouped by format.
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

/** Reserved GitHub wiki files, never rendered as doc pages */
function isReserved(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

/** Whether the file is a supported doc format */
export function getDocFormat(file: string): DocFormat | null {
  const dot = file.lastIndexOf('.')
  if (dot === -1) return null

  return DOC_EXTENSIONS[file.slice(dot).toLowerCase()] ?? null
}

/** Strip the doc extension; non-doc files come back untouched */
export function stripDocExtension(file: string): string {
  if (!getDocFormat(file)) return file

  return file.slice(0, file.lastIndexOf('.'))
}

/** A root-level Home.* maps to the docs home page */
function isHomeRoot(file: string): boolean {
  if (getDocFormat(file) === null) return false
  if (file.includes('/')) return false

  return stripDocExtension(file).toLowerCase() === 'home'
}

/**
 * URL segment: keeps ASCII alphanumerics and CJK characters, folds the rest
 * into hyphens. Chinese wiki titles keep their original text — turning them
 * into pinyin would lose information.
 */
export function slugifySegment(segment: string): string {
  const slug = segment
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9一-鿿-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  // An all-punctuation name collapses to empty; fall back to URI encoding so the link stays valid
  return slug || encodeURIComponent(segment.trim().toLowerCase())
}

/** Map a repo file path to its /docs route: `Home.md` → '' */
export function fileToSlug(file: string): string {
  if (isHomeRoot(file)) return ''

  return stripDocExtension(file)
    .split('/')
    .map(slugifySegment)
    .join('/')
}

/** Strip YAML frontmatter when present (Markdown only) */
function stripFrontmatter(source: string): string {
  const content = source.charCodeAt(0) === 0xFEFF ? source.slice(1) : source
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/**
 * Take the first level-one heading as the title and remove it from the body:
 * the page renders the title itself, keeping it would duplicate it.
 * Markdown uses `# Title`, AsciiDoc uses `= Title`.
 */
export function extractTitle(source: string, format: DocFormat): { title: string | null, body: string } {
  const lines = (format === 'markdown' ? stripFrontmatter(source) : source).split(/\r?\n/)
  const pattern = format === 'asciidoc' ? /^=\s+(.+?)\s*$/ : /^#\s+(.+?)\s*#*$/

  let title: string | null = null
  let titleIndex = -1

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()

    // Blank lines, plus leading AsciiDoc attributes and comments, are not body lines
    if (trimmed === '') continue
    if (format === 'asciidoc' && (trimmed.startsWith(':') || trimmed.startsWith('//'))) continue

    const heading = pattern.exec(line)
    if (heading) {
      title = heading[1]!.trim()
      titleIndex = index
    }

    // Only the first meaningful line can be the title; stop looking after it
    break
  }

  // Drop only the title line; everything else (AsciiDoc attributes included) stays
  const body = titleIndex === -1
    ? lines.join('\n')
    : [...lines.slice(0, titleIndex), ...lines.slice(titleIndex + 1)].join('\n')

  return { title, body }
}

/**
 * Read the nav order a doc declares explicitly.
 * Markdown uses YAML frontmatter, AsciiDoc uses document attributes.
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

/** Fallback when the title is missing: `getting-started` → `Getting started` */
export function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words === '' ? name : words.replace(/^\w/, char => char.toUpperCase())
}

/** Collect doc files recursively, skipping `_`-prefixed and hidden entries */
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

/** Scan the cloned directory into a list of docs with titles */
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

/** Sort by explicit order first, then a stable folder/title order */
function compareNodes(a: DocsNavNode, b: DocsNavNode): number {
  const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  if (orderDiff !== 0) return orderDiff

  const aIsFolder = (a.children.length > 0)
  const bIsFolder = (b.children.length > 0)
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1

  return a.title.localeCompare(b.title, 'zh-Hans-CN')
}

/** Build the sidebar tree from the flat list; DFS order drives prev/next */
export function buildNavTree(entries: DocsSourceEntry[]): DocsNavNode[] {
  const root: DocsNavNode[] = []

  for (const entry of entries) {
    // A root-level Home.* stays as a root entry.
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
        // Folders inherit the earliest child order so nested nav stays hand-orderable.
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

/** Flatten the tree depth-first into linear reading order */
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
