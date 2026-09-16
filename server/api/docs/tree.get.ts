import { getDocsSnapshot } from '../../utils/docs/store'

/**
 * 侧边栏导航树。命中 snapshot 缓存时不读磁盘，
 * 只有拉取到新提交后才会重建。
 */
export default defineEventHandler(async (): Promise<DocsTreeResponse> => {
  const snapshot = await getDocsSnapshot()

  return {
    tree: snapshot.tree,
    updatedAt: snapshot.updatedAt,
    head: snapshot.head,
  }
})
