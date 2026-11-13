/**
 * Data contract for the docs site, shared by server and client
 * (Nuxt auto-imports from shared/types).
 */

/** Language directories present in the Wiki */
export type DocsLanguage = 'zh' | 'en'

/** Table-of-contents entry */
export interface DocsTocEntry {
  id: string
  text: string
  depth: number
}

/** Metadata for one doc; an empty slug means the home page (Home.md) */
export interface DocsPageMeta {
  slug: string
  file: string
  title: string
}

/** Sidebar tree node: leaves are navigable docs, branches stand for directories */
export interface DocsNavNode {
  slug: string
  title: string
  /** Manual nav order declared in the doc; lower values come first */
  order?: number
  /** Repo file path for leaves, empty string for directory nodes */
  file: string
  children: DocsNavNode[]
}

/** Response of GET /api/docs/tree */
export interface DocsTreeResponse {
  tree: DocsNavNode[]
  updatedAt: string
  head: string
}

/** Response of GET /api/docs/page?slug= */
export interface DocsPage extends DocsPageMeta {
  html: string
  toc: DocsTocEntry[]
  /** URL for editing this page on the GitHub Wiki */
  editUrl: string
  prev: DocsPageMeta | null
  next: DocsPageMeta | null
  updatedAt: string
}
