import type { TableSyncAdapter } from '../table-sync-adapter'

import * as repo from '@/db/staff-register/repo'
import { fetchStaffRegisterEntries } from '@/api/staff-register'
import type { Entry } from '@/views/staffRegister/types'
import type { ConflictResolutionStrategy } from '@/sync/conflict-resolver'

export function createStaffRegisterAdapter(): TableSyncAdapter {
  console.log('StaffRegisterAdapter---------------------')
  return {
    tableName: 'work_entries',
    getUnsynced: async (): Promise<Entry[]> => {
      const unsynced = (await repo.getUnsyncedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry)
      console.log('getUnsynced', unsynced)
      return unsynced
    },
    getDeleted: async (): Promise<Entry[]> =>
      (await repo.getDeletedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry),
    markAsSynced: async (id: number): Promise<void> => {
      console.log('markAsSynced for id:', id)
      const entries = await repo.getWorkEntries()
      const entry = entries.find((e) => e.id === id)
      if (!entry) return
      entry.synced = 1
      await repo.upsertWorkEntry(entry)
    },
    permanentDelete: async (id: number): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    // NOTE: The following offline-block is for mock-API/dev only!
    // Remove this check when using a real API in production.
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      console.log('-------------------batchUpsert called with items:', items )
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] batchUpsert blocked: offline mode')
        return []
      }

      const api = await import('@/api/staff-register')
      const allEntries = await api.fetchStaffRegisterEntries()
      const results = []

      for (const item of items) {
        if (!item.id) continue

        const existsInApi = allEntries.some((e) => e.id === item.id)
        let resultItem: Entry
        console.log('________________________batchUpsert item:', item)
        if (existsInApi) {
          console.log('---------------Item exists in API, calling updateEntry from batchUpsert:', item)
          resultItem = await api.updateEntry(item)
        } else {
          console.log('---------------Item does not exist in API, calling createEntry from batchUpsert:', item)
          resultItem = await api.createEntry(item)
        }

        await repo.upsertWorkEntry({ ...resultItem, synced: 1 })
        results.push(resultItem)
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
      console.log('-------------------createItem called with item:', item)
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('[StaffRegisterAdapter] createItem blocked: offline mode')
        return item
      }
      const api = await import('@/api/staff-register')

      // If item already has an ID from API (> 7), update instead
      const allEntries = await api.fetchStaffRegisterEntries()
      const existsInApi = allEntries.some((e) => e.id === item.id)

      let resultItem: Entry
      if (existsInApi) {
        console.log('---------------Item exists in API, calling updateEntry from createItem:', item)
        resultItem = await api.updateEntry(item)
      } else {
        console.log('---------------Item does not exist in API, calling createEntry from createItem:', item)
        resultItem = await api.createEntry(item)
      }

      // Markera som synced i lokal databas
      await repo.upsertWorkEntry({ ...resultItem, synced: 1 })
      return resultItem
    },
    deleteItem: async (id: number): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    fetchAll: async (): Promise<Entry[]> => fetchStaffRegisterEntries(),
    fetchSince: async (): Promise<Entry[]> => fetchStaffRegisterEntries(),
    mergeRemote: async (
      remoteItem: Entry,
      strategy: ConflictResolutionStrategy = 'last-write-wins'
    ): Promise<{ resolved: Entry; conflictDetected: boolean }> => {
      if (!remoteItem.id) {
        return { resolved: remoteItem, conflictDetected: true }
      }
      const local = (await repo.getWorkEntries()).find((e) => e.id === remoteItem.id)

      if (!local) {
        await repo.upsertWorkEntry({ ...remoteItem, synced: 1 })
        return { resolved: remoteItem, conflictDetected: false }
      }

      // IMPORTANT: If local entry is unsynced, skip merge and keep local changes
      // Let drainOutbox push these changes in next sync cycle
      if (local.synced === 0) {
        console.log(`[mergeRemote] Skipping merge for unsynced local entry ID ${local.id} - keeping local changes`)
        return { resolved: local, conflictDetected: false }
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
