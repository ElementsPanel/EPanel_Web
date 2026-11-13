import { getDocsSnapshot } from '../../utils/docs/store'

/**
 * Sidebar navigation tree. A snapshot hit means no disk access;
 * the tree is rebuilt only after a new commit has been pulled.
 */
export default defineEventHandler(async (): Promise<DocsTreeResponse> => {
  const snapshot = await getDocsSnapshot()

  return {
    tree: snapshot.tree,
    updatedAt: snapshot.updatedAt,
    head: snapshot.head,
  }
})
