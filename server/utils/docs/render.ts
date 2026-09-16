import { convert } from 'asciidoctor'
import MarkdownIt from 'markdown-it'
import { stripDocExtension, type DocFormat } from './source'

export interface RenderContext {
  /** 当前正在渲染的文件相对路径，用于解析相对链接 */
  currentFile: string
  /** 仓库文件路径（小写、无扩展名）→ 文档 slug */
  slugByFile: Record<string, string>
}

export interface RenderedDoc {
  html: string
  toc: DocsTocEntry[]
}

/**
 * 只声明真正用到的 token 结构，避免依赖 @types/markdown-it 的内部模块路径。
 * 结合下方 Renderer.rules 的一次性断言，typecheck 不受 types 包版本影响。
 */
interface MdToken {
  type: string
  tag: string
  content: string
  children?: MdToken[] | null
  attrGet(name: string): string | null
  attrSet(name: string, value: string): void
}

interface MdSelf {
  renderToken(tokens: MdToken[], index: number, options: object): string
}

type MdRenderRule = (
  tokens: MdToken[],
  index: number,
  options: object,
  env: unknown,
  self: MdSelf,
) => string

function parentDir(file: string): string {
  const index = file.lastIndexOf('/')
  return index === -1 ? '' : file.slice(0, index)
}

/** 归一化相对路径：去掉 `.` / `..` 与多余斜杠 */
function normalizePath(value: string): string {
  const segments: string[] = []

  for (const part of value.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') segments.pop()
    else segments.push(part)
  }

  return segments.join('/')
}

/** 把内部链接目标解析成文档 slug，命中不了返回 undefined */
function lookupSlug(target: string, context: RenderContext): string | undefined {
  // 必须同时剥掉 .md 与 .adoc 等扩展名，否则跨格式的链接永远匹配不上
  const withoutExtension = stripDocExtension(target.split('?')[0]!.split('#')[0]!)
  return context.slugByFile[normalizePath(withoutExtension).toLowerCase()]
}

/**
 * 重写文档内部链接。
 * wiki 中的 `Foo.md`、`../Bar.md`、`/Guide/Setup.md` 都应指向站内文档页，
 * 保留原有 fragment 拼到新地址上；锚点与外部链接保持原样。
 */
function mapHref(href: string, context: RenderContext): string | null {
  const raw = href.trim()
  if (raw === '') return null
  if (raw.startsWith('#') || raw.startsWith('//')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null

  const hashIndex = raw.indexOf('#')
  const pathPart = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const fragment = hashIndex >= 0 ? raw.slice(hashIndex) : ''

  // 先按「相对当前文件」解析，再退回到「相对仓库根目录」
  const parent = parentDir(context.currentFile)
  const relativeTarget = parent === '' ? pathPart : `${parent}/${pathPart}`

  const slug = lookupSlug(relativeTarget, context) ?? lookupSlug(pathPart, context)
  if (slug === undefined) return null

  return slug === '' ? `/docs${fragment}` : `/docs/${slug}${fragment}`
}

/** 标题 anchor：保留中英文与数字，其余折叠为连字符 */
function anchorId(text: string, used: Map<string, number>): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9一-鿿-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'

  const count = used.get(base) ?? 0
  used.set(base, count + 1)

  return count === 0 ? base : `${base}-${count}`
}

/** 取标题 inline token 的纯文本，跳过链接标记等语法符号 */
function inlineText(token: MdToken | undefined): string {
  if (!token || token.type !== 'inline' || !token.children) return ''

  return token.children
    .filter(child => child.type === 'text' || child.type === 'code_inline')
    .map(child => child.content)
    .join('')
    .trim()
}

/**
 * 渲染单篇文档。
 * 每次渲染新建实例：标题 anchor 去重需要独立状态，
 * 链接重写也依赖当前文件路径。
 */
export function renderMarkdown(source: string, context: RenderContext): RenderedDoc {
  const md = new MarkdownIt({
    // 关闭原始 HTML 通道，配合 markdown-it 自身的转义避免 XSS
    html: false,
    linkify: true,
    typographer: false,
  })

  const headingIds = new Map<string, number>()
  const toc: DocsTocEntry[] = []

  const renderToken = (tokens: MdToken[], index: number, options: object, _env: unknown, self: MdSelf) =>
    self.renderToken(tokens, index, options)

  const rules = md.renderer.rules as unknown as Record<string, MdRenderRule>

  rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index]!
    const text = inlineText(tokens[index + 1])
    const id = anchorId(text, headingIds)

    token.attrSet('id', id)
    toc.push({ id, text, depth: Number(token.tag.slice(1)) })

    return renderToken(tokens, index, options, env, self)
  }

  rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index]!
    const href = token.attrGet('href')

    if (href) {
      const mapped = mapHref(href, context)
      if (mapped) token.attrSet('href', mapped)
    }

    return renderToken(tokens, index, options, env, self)
  }

  return { html: md.render(source), toc }
}

/** 还原 HTML 属性里最常见的实体，便于按原样匹配链接目标 */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * AsciiDoc 走的是 asciidoctor 直接产出 HTML，
 * 无法像 markdown-it 那样挂钩 token，只能对生成结果的 href 做改写。
 */
function rewriteHtmlHrefs(html: string, context: RenderContext): string {
  return html.replace(/\shref="([^"]*)"/g, (match, rawHref: string) => {
    const mapped = mapHref(decodeHtmlEntities(rawHref).trim(), context)
    if (mapped === null) return match

    return ` href="${escapeHtmlAttribute(mapped)}"`
  })
}

/** asciidoctor 在 standalone: false 下自动生成 `<h2 id="...">` */
const HTML_HEADING_RE = /<h([2-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi

function extractTocFromHtml(html: string): DocsTocEntry[] {
  const toc: DocsTocEntry[] = []

  for (const match of html.matchAll(HTML_HEADING_RE)) {
    const id = /id="([^"]*)"/.exec(match[2] ?? '')?.[1]
    if (!id) continue

    const text = decodeHtmlEntities((match[3] ?? '').replace(/<[^>]*>/g, '')).trim()

    toc.push({ id, text, depth: Number(match[1]) })
  }

  return toc
}

async function renderAsciidoc(source: string, context: RenderContext): Promise<RenderedDoc> {
  const converted = await convert(source, {
    // 只要正文片段，不要 <html>/<head> 包裹
    standalone: false,
    // 文档来自远端仓库，禁用 include 等访问本地资源的能力
    safe: 'secure',
    attributes: {
      // 为小节生成 id，供目录锚点使用
      sectids: 'true',
    },
  })

  const html = typeof converted === 'string' ? converted : ''

  return {
    html: rewriteHtmlHrefs(html, context),
    toc: extractTocFromHtml(html),
  }
}

/** 按文件格式选择渲染器；asciidoctor 的 convert 是异步的 */
export function renderDoc(source: string, format: DocFormat, context: RenderContext): Promise<RenderedDoc> | RenderedDoc {
  if (format === 'asciidoc') return renderAsciidoc(source, context)

  return renderMarkdown(source, context)
}
