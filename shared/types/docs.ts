/**
 * 文档站的数据契约，服务端与前端共用（Nuxt 会自动从 shared/types 导入）。
 */

/** Wiki 中已有的文档语言目录 */
export type DocsLanguage = 'zh' | 'en'

/** 目录条目 */
export interface DocsTocEntry {
  id: string
  text: string
  depth: number
}

/** 一篇文档的元信息，slug 为空字符串表示首页（对应 Home.md） */
export interface DocsPageMeta {
  slug: string
  file: string
  title: string
}

/** 侧边栏导航树的节点，叶子节点为可跳转的文档，非叶子节点代表目录 */
export interface DocsNavNode {
  slug: string
  title: string
  /** 文档内声明的手动导航顺序，数字越小越靠前 */
  order?: number
  /** 叶子节点对应的仓库文件路径，目录节点为空字符串 */
  file: string
  children: DocsNavNode[]
}

/** GET /api/docs/tree 的响应 */
export interface DocsTreeResponse {
  tree: DocsNavNode[]
  updatedAt: string
  head: string
}

/** GET /api/docs/page?slug= 的响应 */
export interface DocsPage extends DocsPageMeta {
  html: string
  toc: DocsTocEntry[]
  /** 在 GitHub Wiki 上编辑本页的地址 */
  editUrl: string
  prev: DocsPageMeta | null
  next: DocsPageMeta | null
  updatedAt: string
}
