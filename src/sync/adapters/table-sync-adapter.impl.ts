import type { TableSyncAdapter } from './table-sync-adapter.types'

// Table adapter registry
const tableAdapters: Map<string, () => TableSyncAdapter> = new Map()

export function registerTableAdapter(tableName: string, factory: () => TableSyncAdapter): void {
  tableAdapters.set(tableName, factory)
}

export function getTableAdapter(tableName: string): TableSyncAdapter | null {
  const factory = tableAdapters.get(tableName)

  return factory ? factory() : null
}
