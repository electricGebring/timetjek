import type { ConflictResolutionStrategy } from '@/sync/conflict-resolver'
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
  mergeRemote: (remoteItem: any, strategy?: ConflictResolutionStrategy) => Promise<{ resolved: any; conflictDetected: boolean }>
  updateStore: () => Promise<void>
}

// Table adapter registry
const tableAdapters: Map<string, () => TableSyncAdapter> = new Map()

export function registerTableAdapter(tableName: string, factory: () => TableSyncAdapter): void {
  tableAdapters.set(tableName, factory)
}

export function getTableAdapter(tableName: string): TableSyncAdapter | null {
  const factory = tableAdapters.get(tableName)
  return factory ? factory() : null
}
