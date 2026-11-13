import { convert } from 'asciidoctor'
import MarkdownIt from 'markdown-it'
import { stripDocExtension, type DocFormat } from './source'

export interface RenderContext {
  /** Path of the file being rendered, used to resolve relative links */
  currentFile: string
  /** Repo file path (lowercase, no extension) → doc slug */
  slugByFile: Record<string, string>
}

export interface RenderedDoc {
  html: string
  toc: DocsTocEntry[]
}

/**
 * Declares only the token shapes actually used, avoiding @types/markdown-it
 * internal module paths. Together with the one-off Renderer.rules cast below,
 * typecheck no longer depends on the types package version.
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

/** Normalize a relative path: drop `.` / `..` and duplicate slashes */
function normalizePath(value: string): string {
  const segments: string[] = []

  for (const part of value.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') segments.pop()
    else segments.push(part)
  }

  return segments.join('/')
}

/** Resolve an internal link target to a doc slug; undefined when it misses */
function lookupSlug(target: string, context: RenderContext): string | undefined {
  // Strip .md and .adoc alike, otherwise cross-format links never match
  const withoutExtension = stripDocExtension(target.split('?')[0]!.split('#')[0]!)
  return context.slugByFile[normalizePath(withoutExtension).toLowerCase()]
}

/**
 * Rewrites internal doc links.
 * `Foo.md`, `../Bar.md` and `/Guide/Setup.md` from the wiki all map to
 * in-site doc pages, keeping the original fragment; anchors and external
 * links are left untouched.
 */
function mapHref(href: string, context: RenderContext): string | null {
  const raw = href.trim()
  if (raw === '') return null
  if (raw.startsWith('#') || raw.startsWith('//')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null

  const hashIndex = raw.indexOf('#')
  const pathPart = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const fragment = hashIndex >= 0 ? raw.slice(hashIndex) : ''

  // Resolve against the current file first, then fall back to the repo root
  const parent = parentDir(context.currentFile)
  const relativeTarget = parent === '' ? pathPart : `${parent}/${pathPart}`

  const slug = lookupSlug(relativeTarget, context) ?? lookupSlug(pathPart, context)
  if (slug === undefined) return null

  return slug === '' ? `/docs${fragment}` : `/docs/${slug}${fragment}`
}

/** Heading anchor: keeps letters, digits and CJK, folds the rest into hyphens */
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

/** Plain text of a heading inline token, skipping link markers and other syntax */
function inlineText(token: MdToken | undefined): string {
  if (!token || token.type !== 'inline' || !token.children) return ''

  return token.children
    .filter(child => child.type === 'text' || child.type === 'code_inline')
    .map(child => child.content)
    .join('')
    .trim()
}

/**
 * Renders a single doc.
 * A fresh instance per render: anchor de-duplication needs its own state,
 * and link rewriting depends on the current file path.
 */
export function renderMarkdown(source: string, context: RenderContext): RenderedDoc {
  const md = new MarkdownIt({
    // Disable raw HTML; markdown-it escaping then blocks XSS
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

/** Decode the commonest entities in HTML attributes so link targets match as-is */
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
 * AsciiDoc goes through asciidoctor, which emits HTML directly — there is no
 * token hook like markdown-it, so hrefs are rewritten on the output instead.
 */
function rewriteHtmlHrefs(html: string, context: RenderContext): string {
  return html.replace(/\shref="([^"]*)"/g, (match, rawHref: string) => {
    const mapped = mapHref(decodeHtmlEntities(rawHref).trim(), context)
    if (mapped === null) return match

    return ` href="${escapeHtmlAttribute(mapped)}"`
  })
}

/** With standalone: false, asciidoctor emits `<h2 id="...">` itself */
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
    // Body fragment only, no <html>/<head> wrapper
    standalone: false,
    // Docs come from a remote repo; block include and local resource access
    safe: 'secure',
    attributes: {
      // Generate section ids so the TOC can link to them
      sectids: 'true',
    },
  })

  const html = typeof converted === 'string' ? converted : ''

  return {
    html: rewriteHtmlHrefs(html, context),
    toc: extractTocFromHtml(html),
  }
}

/** Pick a renderer per format; asciidoctor's convert is async */
export function renderDoc(source: string, format: DocFormat, context: RenderContext): Promise<RenderedDoc> | RenderedDoc {
  if (format === 'asciidoc') return renderAsciidoc(source, context)

  return renderMarkdown(source, context)
}
