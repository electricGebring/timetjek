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
  mergeRemote: (
    remoteItem: any,
    strategy?: ConflictResolutionStrategy
  ) => Promise<{ resolved: any; conflictDetected: boolean }>
  /** Refresh UI store: from DB (no args) or from given entries (e.g. after pull, in-memory resolved + unsynced). */
  updateStore: (entries?: any[]) => Promise<void>
}
