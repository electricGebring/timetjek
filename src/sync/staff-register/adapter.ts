import type { TableSyncAdapter } from '../table-sync-adapter'
import { TABLE_WORK_ENTRIES } from '@/constants/tables'
import { assertOnline, whenOffline } from '@/utils/connectivity'
import * as repo from '@/db/staff-register/repo'
import { fetchStaffRegisterEntries, deleteEntry } from '@/api/staff-register'
import type { Entry } from '@/views/staffRegister/types'
import type { ConflictResolutionStrategy as ConflictStrategyType } from '@/enums/ConflictResolutionStrategy'
import { mergeRemoteWorkEntry } from './merge-remote'

export function createStaffRegisterAdapter(): TableSyncAdapter {
  const fetchEntriesOrThrow = async (api: typeof import('@/api/staff-register')) => {
    return await api.fetchStaffRegisterEntries()
  }

  return {
    tableName: TABLE_WORK_ENTRIES,
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
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      assertOnline('batchUpsert')

      const api = await import('@/api/staff-register')
      const allEntries = await fetchEntriesOrThrow(api)
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

        await repo.upsertWorkEntry({ ...resultItem })
        results.push(resultItem)
      }

      return results
    },
    batchDelete: async (ids: number[]): Promise<void> => {
      if (whenOffline('batchDelete')) return
      for (const id of ids) {
        try {
          await deleteEntry(id)
        } catch (e) {
          if ((e as any)?.message?.includes('404')) continue
          throw e
        }
      }
    },
    createItem: async (item: Entry): Promise<Entry> => {
      assertOnline('createItem')
      const api = await import('@/api/staff-register')

      const allEntries = await fetchEntriesOrThrow(api)
      const existsInApi = allEntries.some((e) => e.id === item.id)

      let resultItem: Entry
      if (existsInApi) {
        resultItem = await api.updateEntry(item)
      } else {
        resultItem = await api.createEntry(item)
      }

      await repo.upsertWorkEntry({ ...resultItem })
      return resultItem
    },
    deleteItem: async (id: number): Promise<void> => {
      if (whenOffline('deleteItem')) return
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
    mergeRemote: (remoteItem: Entry, strategy?: ConflictStrategyType) => mergeRemoteWorkEntry(remoteItem, strategy),
    updateStore: async (): Promise<void> => {
      const domain = await import('@/domain/staff-register/domain')
      await domain.updateStoreFromDb()
    }
  }
}
