import type { TableSyncAdapter } from '../table-sync-adapter'

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
      const domain = await import('@/domain/todos/domain')
      return domain.updateStoreFromDb()
    },
  }
}
