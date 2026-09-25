import type { DocsLanguage, DocsNavNode } from '../types/docs'

export function isDocsLanguage(value: unknown): value is DocsLanguage {
  return value === 'zh' || value === 'en'
}

export function getDocsLanguage(slug: string): DocsLanguage | null {
  const language = slug.split('/')[0]
  return isDocsLanguage(language) ? language : null
}

export function docsPath(slug: string): string {
  return slug === '' ? '/docs' : `/docs/${slug}`
}

/** 隐去语言目录本身，只展示所选版本的页面。 */
export function getLocalizedDocsTree(tree: DocsNavNode[], language: DocsLanguage): DocsNavNode[] {
  return tree.find(node => node.slug === language)?.children ?? []
}

function collectPageSlugs(nodes: DocsNavNode[]): string[] {
  return nodes.flatMap(node => node.children.length > 0 ? collectPageSlugs(node.children) : [node.slug])
}

/** 同名路径对应译文；译文缺失时回到目标语言的入门页。 */
export function getLocalizedDocsSlug(slug: string, language: DocsLanguage, tree: DocsNavNode[]): string {
  const pages = collectPageSlugs(getLocalizedDocsTree(tree, language))
  const currentLanguage = getDocsLanguage(slug)
  const relativeSlug = currentLanguage ? slug.slice(currentLanguage.length).replace(/^\//, '') : slug
  const translatedSlug = `${language}/${relativeSlug}`
  if (pages.includes(translatedSlug)) return translatedSlug

  const homeSlug = `${language}/getting-started`
  return pages.includes(homeSlug) ? homeSlug : pages[0] ?? homeSlug
}
