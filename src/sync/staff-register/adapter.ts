import type { TableSyncAdapter } from '../table-sync-adapter'

import * as repo from '@/db/staff-register/repo'
import { fetchStaffRegisterEntries } from '@/api/staff-register'
import type { Entry } from '@/views/staffRegister/types'

export function createStaffRegisterAdapter(): TableSyncAdapter {
  return {
    tableName: 'work_entries',
    getUnsynced: async (): Promise<Entry[]> => repo.getUnsyncedWorkEntries(),
    getDeleted: async (): Promise<Entry[]> => repo.getDeletedWorkEntries(),
    markAsSynced: async (id: number): Promise<void> => {
      const entries = await repo.getWorkEntries();
      const entry = entries.find((e: Entry) => e.id === id);
      if (!entry) return;
      entry.synced = 1;
      await repo.upsertWorkEntry(entry);
    },
    permanentDelete: async (id: number): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        // MOCK-API DEV: Prevent sync to local db when offline (remove for real API)
        console.warn('[StaffRegisterAdapter] batchUpsert blocked: offline mode')
        return []
      }
      const results = []
      for (const item of items) {
        if (!item.id) {
          continue
        }
        await repo.upsertWorkEntry(item)
        results.push(item)
      }
      return results
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    batchDelete: async (ids: number[]): Promise<void> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        // MOCK-API DEV: Prevent sync to local db when offline (remove for real API)
        console.warn('[StaffRegisterAdapter] batchDelete blocked: offline mode')
        return
      }
      for (const id of ids) {
        await repo.permanentDeleteWorkEntry(id)
      }
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    createItem: async (item: Entry): Promise<Entry> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        // MOCK-API DEV: Prevent sync to local db when offline (remove for real API)
        console.warn('[StaffRegisterAdapter] createItem blocked: offline mode')
        return item
      }
      if (!item.id) delete item.id;
      await repo.upsertWorkEntry(item)
      return item
    },
    deleteItem: async (id: number): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    fetchAll: async (): Promise<Entry[]> => fetchStaffRegisterEntries(),
    fetchSince: async (): Promise<Entry[]> => fetchStaffRegisterEntries(),
    mergeRemote: async (remoteItem: Entry, strategy = 'last-write-wins'): Promise<{ resolved: Entry, conflictDetected: boolean }> => {
      // Förbättrade loggar för att snabbt se deleted-status
      if (!remoteItem.id) {
        return { resolved: remoteItem, conflictDetected: true };
      }
      const local = (await repo.getWorkEntries()).find(e => e.id === remoteItem.id)
      // [SYNC][mergeRemote] log borttagen
      if (!local) {
        await repo.upsertWorkEntry(remoteItem)
        return { resolved: remoteItem, conflictDetected: false }
      }
      const { defaultConflictResolver } = await import('@/sync/conflict-resolver')
      const result = defaultConflictResolver.resolve(local, remoteItem, strategy)
      // [SYNC][mergeRemote][RESOLVED] log borttagen
      await repo.upsertWorkEntry(result.resolved)
      return { resolved: result.resolved, conflictDetected: result.conflictDetected }
    },
    updateStore: async (): Promise<void> => {
      const domain = await import('@/domain/staff-register/domain');
      await domain.updateStoreFromDb();
    },
  }
}
