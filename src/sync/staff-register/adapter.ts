import type { TableSyncAdapter } from '../table-sync-adapter'

import * as repo from '@/db/staff-register/repo'
import { fetchStaffRegisterEntries, deleteEntry } from '@/api/staff-register'
import type { Entry } from '@/views/staffRegister/types'
import {
  ConflictResolutionStrategy,
  type ConflictResolutionStrategy as ConflictStrategyType
} from '@/enums/ConflictResolutionStrategy'

export function createStaffRegisterAdapter(): TableSyncAdapter {
  const safeFetchEntries = async (api: typeof import('@/api/staff-register')) => {
    try {
      return await api.fetchStaffRegisterEntries()
    } catch (_error) {
      return null
    }
  }

  return {
    tableName: 'work_entries',
    getUnsynced: async (): Promise<Entry[]> => {
      const unsynced = (await repo.getUnsyncedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry)
      return unsynced
    },
    getDeleted: async (): Promise<Entry[]> =>
      (await repo.getDeletedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry),
    markAsSynced: async (id: number): Promise<void> => {
      await repo.markWorkEntryAsSynced(id)
    },
    permanentDelete: async (id: number): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] batchUpsert blocked: offline mode')
        return []
      }

      const api = await import('@/api/staff-register')
      const allEntries = await safeFetchEntries(api)
      if (!allEntries) return []
      const results = []

      for (const item of items) {
        if (!item.id) continue

        const existsInApi = allEntries.some((e) => e.id === item.id)
        let resultItem: Entry
        if (existsInApi) {
          resultItem = await api.updateEntry(item)
        } else {
          resultItem = await api.createEntry(item)
        }

        await repo.upsertWorkEntry({ ...resultItem, synced: 1 })
        results.push(resultItem)
      }

      return results
    },
    // API deletes only; SyncEngine calls permanentDelete for each id after success
    batchDelete: async (ids: number[]): Promise<void> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] batchDelete blocked: offline mode')
        return
      }
      for (const id of ids) {
        try {
          await deleteEntry(id)
        } catch (e) {
          if ((e as any)?.message?.includes('404')) continue
          throw e
        }
      }
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    createItem: async (item: Entry): Promise<Entry> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] createItem blocked: offline mode')
        return item
      }
      const api = await import('@/api/staff-register')

      // If item already has an ID from API (> 7), update instead
      const allEntries = await safeFetchEntries(api)
      if (!allEntries) return item
      const existsInApi = allEntries.some((e) => e.id === item.id)

      let resultItem: Entry
      if (existsInApi) {
        resultItem = await api.updateEntry(item)
      } else {
        resultItem = await api.createEntry(item)
      }

      // Markera som synced i lokal databas
      await repo.upsertWorkEntry({ ...resultItem, synced: 1 })
      return resultItem
    },
    // API delete only; SyncEngine calls permanentDelete after success
    deleteItem: async (id: number): Promise<void> => {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] deleteItem blocked: offline mode')
        return
      }
      await deleteEntry(id)
    },
    fetchAll: async (): Promise<Entry[]> => {
      try {
        return await fetchStaffRegisterEntries()
      } catch (_error) {
        return []
      }
    },
    fetchSince: async (): Promise<Entry[]> => {
      try {
        return await fetchStaffRegisterEntries()
      } catch (_error) {
        return []
      }
    },
    mergeRemote: async (
      remoteItem: Entry,
      strategy: ConflictStrategyType = ConflictResolutionStrategy.LAST_WRITE_WINS
    ): Promise<{ resolved: Entry; conflictDetected: boolean }> => {
      if (!remoteItem.id) {
        return { resolved: remoteItem, conflictDetected: true }
      }
      const allLocalEntries = await repo.getWorkEntries()
      let local = allLocalEntries.find((e) => e.id === remoteItem.id)


      if (!local) {
        await repo.upsertWorkEntry({ ...remoteItem, synced: 1 })
        return { resolved: remoteItem, conflictDetected: false }
      }
      if (local.synced === 0) {
        return { resolved: local as Entry, conflictDetected: false }
      }
      const { defaultConflictResolver } = await import('@/sync/conflict-resolver')
      const toResolverFormat = (entry: any) => ({
        ...entry,
        updatedAt: entry.updatedAt ? Date.parse(entry.updatedAt) : undefined
      })
      const result = defaultConflictResolver.resolve(toResolverFormat(local), toResolverFormat(remoteItem), strategy)
      await repo.upsertWorkEntry({ ...result.resolved, synced: 1 })
      return { resolved: result.resolved, conflictDetected: result.conflictDetected }
    },
    updateStore: async (): Promise<void> => {
      const domain = await import('@/domain/staff-register/domain')
      await domain.updateStoreFromDb()
    }
  }
}
