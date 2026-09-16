import { getDocPage } from '../../utils/docs/store'

/**
 * 单篇文档内容（已渲染好的 HTML）。
 * slug 为空表示首页 Home.md。
 */
export default defineEventHandler(async (event): Promise<DocsPage> => {
  const slug = normalizeSlug(getQuery(event).slug)

  const page = await getDocPage(slug)
  if (!page) {
    throw createError({
      statusCode: 404,
      statusMessage: 'DocsPageNotFound',
      message: slug === '' ? '尚未找到文档首页（Home.md）。' : `文档不存在：${slug}`,
    })
  }

  return page
})

function normalizeSlug(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw

  return String(value ?? '')
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
    .join('/')
}
