/**
 * Table sync adapter - provides table-specific dependencies for SyncEngine
 * This allows SyncEngine to work with different tables
 */

export type TableSyncAdapter = {
  tableName: string
  getUnsynced: () => Promise<any[]>
  getDeleted: () => Promise<any[]>
  markAsSynced: (id: number) => Promise<void>
  permanentDelete: (id: number) => Promise<void>
  batchUpsert: (items: any[]) => Promise<any[]>
  batchDelete: (ids: number[]) => Promise<void>
  createItem: (item: any) => Promise<any>
  deleteItem: (id: number) => Promise<void>
  fetchAll: () => Promise<any[]>
  fetchSince: (timestamp: number) => Promise<any[]>
  mergeRemote: (remoteItem: any, strategy?: string) => Promise<{ resolved: any; conflictDetected: boolean }>
  updateStore: () => Promise<void>
}

/**
 * Create adapter for todos table
 */
export function createTodosAdapter(): TableSyncAdapter {
  return {
    tableName: 'todos',
    getUnsynced: async () => {
      const repo = await import('@/db/todos/repo')
      return repo.getUnsyncedTodos()
    },
    getDeleted: async () => {
      const repo = await import('@/db/todos/repo')
      return repo.getDeletedTodos()
    },
    markAsSynced: async (id: number) => {
      const repo = await import('@/db/todos/repo')
      return repo.markAsSynced(id)
    },
    permanentDelete: async (id: number) => {
      const repo = await import('@/db/todos/repo')
      return repo.permanentDelete(id)
    },
    batchUpsert: async (items: any[]) => {
      const api = await import('@/api/todos-incremental')
      return api.batchUpsertTodos(items)
    },
    batchDelete: async (ids: number[]) => {
      const api = await import('@/api/todos-incremental')
      return api.batchDeleteTodos(ids)
    },
    createItem: async (item: any) => {
      const api = await import('@/api/todos')
      return api.createTodo(item.title, item.id, item.updatedAt)
    },
    deleteItem: async (id: number) => {
      const api = await import('@/api/todos')
      return api.deleteTodo(id)
    },
    fetchAll: async () => {
      const api = await import('@/api/todos')
      return api.fetchTodos()
    },
    fetchSince: async (timestamp: number) => {
      const api = await import('@/api/todos-incremental')
      return api.fetchTodosSince(timestamp)
    },
    mergeRemote: async (remoteItem: any, strategy = 'last-write-wins') => {
      const domain = await import('@/domain/domain')
      return domain.mergeRemoteTodo(remoteItem, strategy as any)
    },
    updateStore: async () => {
      const domain = await import('@/domain/domain')
      return domain.updateStoreFromDb()
    },
  }
}

/**
 * Table adapter registry
 * Maps table names to their sync adapters
 */
const tableAdapters: Map<string, () => TableSyncAdapter> = new Map([
  ['todos', createTodosAdapter],
])

/**
 * Get adapter for a table
 */
export function getTableAdapter(tableName: string): TableSyncAdapter | null {
  const factory = tableAdapters.get(tableName)
  return factory ? factory() : null
}

/**
 * Register a table adapter factory
 */
export function registerTableAdapter(tableName: string, factory: () => TableSyncAdapter): void {
  tableAdapters.set(tableName, factory)
}
