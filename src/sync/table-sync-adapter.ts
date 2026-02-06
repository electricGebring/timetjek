import type { ConflictResolutionStrategy } from '@/sync/conflict-resolver'

/**
 * Table sync adapter – table-specific implementation for SyncEngine.
 *
 * Adapter contract (SyncEngine relies on this):
 * - deleteItem(id): Delete this id on the API only. Do not remove from local DB.
 * - batchDelete(ids): Delete these ids on the API only. Do not remove from local DB.
 * - permanentDelete(id): Remove this id from the local DB only. SyncEngine calls this after successful API delete(s).
 * - getUnsynced / getDeleted: Read from local DB. markAsSynced: Update local DB only.
 * - batchUpsert / createItem: Push to API; adapter may update local DB (e.g. mark synced) as needed.
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
