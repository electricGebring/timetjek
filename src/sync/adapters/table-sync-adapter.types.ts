import type { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'

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
export type TableSyncAdapter<T = unknown> = {
  tableName: string
  getUnsynced: () => Promise<T[]>
  getDeleted: () => Promise<T[]>
  markAsSynced: (id: string | number) => Promise<void>
  permanentDelete: (id: string | number) => Promise<void>
  batchUpsert: (items: T[]) => Promise<T[]>
  batchDelete: (ids: (string | number)[]) => Promise<void>
  createItem: (item: T) => Promise<T>
  deleteItem: (id: string | number) => Promise<void>
  fetchAll: () => Promise<T[]>
  fetchSince: (timestamp: number) => Promise<T[]>
  mergeRemote: (
    remoteItem: T,
    strategy?: ConflictResolutionStrategy
  ) => Promise<{ resolved: T; conflictDetected: boolean }>
  /** Refresh UI store: from DB (no args) or from given entries (e.g. after pull, in-memory resolved + unsynced). */
  updateStore: (entries?: T[]) => Promise<void>
}