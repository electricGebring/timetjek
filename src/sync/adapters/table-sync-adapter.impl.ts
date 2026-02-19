import type { TableSyncAdapter } from './table-sync-adapter.types'

// Table adapter registry
const tableAdapters: Map<string, () => TableSyncAdapter<unknown>> = new Map()

export function registerTableAdapter<T>(tableName: string, factory: () => TableSyncAdapter<T>): void {
  tableAdapters.set(tableName, factory as () => TableSyncAdapter<unknown>)
}

export function getTableAdapter<T>(tableName: string): TableSyncAdapter<T> | null {
  const factory = tableAdapters.get(tableName)

  return factory ? (factory() as TableSyncAdapter<T>) : null
}
