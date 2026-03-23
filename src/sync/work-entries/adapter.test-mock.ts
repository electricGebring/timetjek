/**
 * Test-only mock adapter for work_entries sync.
 * Simulates API calls for Node.js sync tests without a real server.
 * Do not use in production.
 */

import type { TableSyncAdapter } from '../table-sync-adapter'

import { TABLE_WORK_ENTRIES } from '@/constants/tables'

import * as repo from '@/db/work-entries/repo'

import { workEntryToEntry, entryToWorkEntry, type AnyWorkEntry } from '@/db/work-entries/work-entry.mapper'

import type { Entry } from '@/views/staffRegister/types'

/**
 * Creates a mock work entries sync adapter for testing.
 * Uses real repo for local DB; simulates API (no HTTP).
 */
export function createMockWorkEntriesAdapter(): TableSyncAdapter<Entry> {
  return {
    tableName: TABLE_WORK_ENTRIES,

    getUnsynced: async (): Promise<Entry[]> => {
      const unsynced = (await repo.getUnsyncedWorkEntries())
        .filter((e: AnyWorkEntry) => e.id !== null)
        .map(workEntryToEntry)

      return unsynced
    },

    getDeleted: async (): Promise<Entry[]> =>
      (await repo.getDeletedWorkEntries()).filter((e: AnyWorkEntry) => e.id !== null).map(workEntryToEntry),

    markAsSynced: async (id: string): Promise<void> => {
      await repo.markWorkEntryAsSynced(id)
    },

    permanentDelete: async (id: string): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },

    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      const ids = items.filter((item) => item.id).map((item) => item.id)

      if (ids.length > 0) {
        await repo.markEntriesAsSynced(ids)
      }

      return items
    },

    batchDelete: async (ids: string[]): Promise<void> => {
      if (ids.length > 0) {
        await repo.deletePermanently(ids)
      }
    },

    createItem: async (item: Entry): Promise<Entry> => {
      if (typeof item !== 'object' || item === null || !('id' in item)) {
        throw new Error('Invalid item: not an Entry')
      }

      return item
    },

    deleteItem: async (): Promise<void> => {
      // Simulated: no-op (SyncEngine calls permanentDelete after)
    },

    fetchAll: async (): Promise<Entry[]> => {
      const all = await repo.getWorkEntries()

      return all.map((e: AnyWorkEntry) => workEntryToEntry(e))
    },

    fetchSince: async (): Promise<Entry[]> => {
      const all = await repo.getWorkEntries()

      return all.map((e: AnyWorkEntry) => workEntryToEntry(e))
    },

    mergeRemote: async (remoteItem: Entry): Promise<{ resolved: Entry; conflictDetected: boolean }> => {
      await repo.upsertWorkEntry(entryToWorkEntry({ ...remoteItem, synced: 1 }))

      return { resolved: remoteItem, conflictDetected: false }
    },

    updateStore: async (): Promise<void> => {
      // No-op in test (no Vue store)
    }
  }
}
