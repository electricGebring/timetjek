import type { TableSyncAdapter } from '../table-sync-adapter'

import { TABLE_WORK_ENTRIES } from '@/constants/tables'

import { assertOnline, whenOffline } from '@/utils/connectivity'

import * as repo from '@/db/staff-register/repo'

import { fetchStaffRegisterEntries, deleteEntry } from '@/api/staff-register'

import type { Entry } from '@/views/staffRegister/types'

import type { ConflictResolutionStrategy as ConflictStrategyType } from '@/enums/ConflictResolutionStrategy'

import { mergeRemoteWorkEntry } from './merge-remote'

export function createStaffRegisterAdapter(): TableSyncAdapter<Entry> {
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

      const results: Entry[] = []

      for (const item of items) {
        // Type guard to ensure item is Entry
        if (typeof item !== 'object' || item === null || !('id' in item)) continue

        const entry = item as Entry

        if (!entry.id) continue

        const existsInApi = allEntries.some((e) => e.id === entry.id)

        let resultItem: Entry

        if (existsInApi) {
          resultItem = await api.updateEntry(entry)
        }

 else {
          resultItem = await api.createEntry(entry)
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
        }
 catch (e) {
          if (
            typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string' &&
            ((e as { message: string }).message.includes('404'))
          ) {
            continue
          }

          throw e
        }
      }
    },
    createItem: async (item: Entry): Promise<Entry> => {
      assertOnline('createItem')

      // Type guard to ensure item is Entry
      if (typeof item !== 'object' || item === null || !('id' in item)) {
        throw new Error('Invalid item: not an Entry')
      }

      const entry = item as Entry

      const api = await import('@/api/staff-register')

      const allEntries = await fetchEntriesOrThrow(api)

      const existsInApi = allEntries.some((e) => e.id === entry.id)

      let resultItem: Entry

      if (existsInApi) {
        resultItem = await api.updateEntry(entry)
      }
 else {
        resultItem = await api.createEntry(entry)
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
      }
 catch {
        return []
      }
    },
    fetchSince: async (): Promise<Entry[]> => {
      try {
        return await fetchStaffRegisterEntries()
      }
 catch {
        return []
      }
    },
    mergeRemote: (remoteItem: Entry, strategy?: ConflictStrategyType) => mergeRemoteWorkEntry(remoteItem, strategy),
    updateStore: async (entries?: Entry[]): Promise<void> => {
      const domain = await import('@/domain/staff-register/domain')

      if (entries !== null) {
        await domain.updateStoreFromEntries(entries)
      }
 else {
        await domain.updateStoreFromDb()
      }
    }
  }
}
