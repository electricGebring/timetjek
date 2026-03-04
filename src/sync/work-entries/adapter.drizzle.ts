/**
 * Drizzle-based Staff Register Sync Adapter
 * Uses Drizzle ORM for Node.js contexts (backend, sync workers)
 */

import type { TableSyncAdapter } from '../table-sync-adapter.ts'
import { TABLE_WORK_ENTRIES } from '../../constants/tables.ts'
import * as repo from '../../db/work-entries/repo.ts'
import { workEntryToEntry, entryToWorkEntry, type AnyWorkEntry } from '../../db/work-entries/work-entry.mapper.ts'
import type { Entry } from '../../views/staffRegister/types.ts'
import type { ConflictResolutionStrategy } from '../../enums/ConflictResolutionStrategy.ts'

/**
 * Drizzle-based sync adapter for work_entries table
 * Uses Drizzle ORM queries for sync operations
 */
export function createWorkEntriesDrizzleAdapter(): TableSyncAdapter<Entry> {
  return {
    tableName: TABLE_WORK_ENTRIES,

    /**
     * Get unsynced entries from outbox
     * Uses optimized Drizzle query
     */
    getUnsynced: async (): Promise<Entry[]> => {
      console.log('[DRIZZLE ADAPTER] 📤 Getting unsynced entries...')
      
      const unsyncedWorkEntries = await repo.getUnsyncedForSync()
      
      const entries = unsyncedWorkEntries
        .filter((e: AnyWorkEntry) => e.id !== null)
        .map(workEntryToEntry)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Found ${entries.length} unsynced entries`)
      return entries
    },

    /**
     * Get soft-deleted entries pending API deletion
     * Uses optimized Drizzle query
     */
    getDeleted: async (): Promise<Entry[]> => {
      console.log('[DRIZZLE ADAPTER] 🗑️  Getting deleted entries...')
      
      const deletedWorkEntries = await repo.getDeletedForSync()
      
      const entries = deletedWorkEntries
        .filter((e: AnyWorkEntry) => e.id !== null)
        .map(workEntryToEntry)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Found ${entries.length} deleted entries`)
      return entries
    },

    /**
     * Mark single entry as synced after successful API push
     */
    markAsSynced: async (id: string): Promise<void> => {
      console.log(`[DRIZZLE ADAPTER] ✓ Marking entry ${id} as synced...`)
      await repo.markWorkEntryAsSynced(id)
    },

    /**
     * Permanently delete entry after successful API deletion
     */
    permanentDelete: async (id: string): Promise<void> => {
      console.log(`[DRIZZLE ADAPTER] 🔥 Permanently deleting entry ${id}...`)
      await repo.permanentDeleteWorkEntry(id)
    },

    /**
     * Batch upsert entries to API
     * NOTE: In Drizzle adapter, we simulate API calls
     * In production, replace with actual API client
     */
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      console.log(`[DRIZZLE ADAPTER] 📦 Batch upserting ${items.length} entries...`)

      // TODO: Replace with actual API calls in production
      // For now, just return the items as-is (simulating successful API push)
      
      // After successful API push, mark all as synced
      const ids = items.filter(item => item.id).map(item => item.id)
      await repo.markEntriesAsSynced(ids)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Batch upsert complete for ${ids.length} entries`)
      return items
    },

    /**
     * Batch delete entries from API
     * NOTE: In Drizzle adapter, we simulate API calls
     * In production, replace with actual API client
     */
    batchDelete: async (ids: string[]): Promise<void> => {
      console.log(`[DRIZZLE ADAPTER] 🗑️  Batch deleting ${ids.length} entries...`)

      // TODO: Replace with actual API calls in production
      // For now, just permanently delete them locally (simulating successful API delete)
      
      await repo.deletePermanently(ids)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Batch delete complete for ${ids.length} entries`)
    },

    /**
     * Create single item via API
     * NOTE: In Drizzle adapter, we simulate API call
     */
    createItem: async (item: Entry): Promise<Entry> => {
      console.log(`[DRIZZLE ADAPTER] ➕ Creating entry ${item.id}...`)

      // TypeScript assertions
      if (typeof item !== 'object' || item === null || !('id' in item)) {
        throw new Error('Invalid item: not an Entry')
      }

      // TODO: Replace with actual API call in production
      // For now, just return the item as-is (simulating successful creation)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Entry created`)
      return item
    },

    /**
     * Delete single item via API
     * NOTE: In Drizzle adapter, we simulate API call
     */
    deleteItem: async (id: string): Promise<void> => {
      console.log(`[DRIZZLE ADAPTER] 🗑️  Deleting entry ${id} via API...`)

      // TODO: Replace with actual API call in production
      // For now, just log (simulating successful deletion)
      
      console.log(`[DRIZZLE ADAPTER] ✅ Entry deleted from API`)
    },

    /**
     * Fetch all entries from API
     * NOTE: In Drizzle adapter, we return local entries
     * In production, replace with actual API fetch
     */
    fetchAll: async (): Promise<Entry[]> => {
      console.log(`[DRIZZLE ADAPTER] 🔄 Fetching all entries from API...`)

      // TODO: Replace with actual API call in production
      // For now, return local entries (simulating API response)
      
      const allWorkEntries = await repo.getWorkEntries()
      const entries = allWorkEntries.map((e: AnyWorkEntry) => workEntryToEntry(e))
      
      console.log(`[DRIZZLE ADAPTER] ✅ Fetched ${entries.length} entries`)
      return entries
    },

    /**
     * Merge remote entry into local database
     * Uses domain conflict resolution strategy
     */
    mergeRemote: async (
      remoteItem: Entry,
      strategy?: ConflictResolutionStrategy
    ): Promise<{ resolved: Entry; conflictDetected: boolean }> => {
      console.log(`[DRIZZLE ADAPTER] 🔀 Merging remote entry ${remoteItem.id} with strategy: ${strategy}`)

      // TODO: Implement proper conflict resolution with Drizzle
      // For now, just upsert (last-write-wins)
      
      await repo.upsertWorkEntry(entryToWorkEntry(remoteItem))
      
      console.log(`[DRIZZLE ADAPTER] ✅ Remote entry merged`)
      return { resolved: remoteItem, conflictDetected: false }
    },

    /**
     * Fetch entries modified since timestamp
     * NOTE: In Drizzle adapter, we return all entries
     * In production, replace with actual API call with timestamp filter
     */
    fetchSince: async (): Promise<Entry[]> => {
      console.log(`[DRIZZLE ADAPTER] 🔄 Fetching entries since timestamp...`)

      // TODO: Replace with actual API call in production
      // For now, return all entries (simulating API response)
      
      const allWorkEntries = await repo.getWorkEntries()
      const entries = allWorkEntries.map((e: AnyWorkEntry) => workEntryToEntry(e))
      
      console.log(`[DRIZZLE ADAPTER] ✅ Fetched ${entries.length} entries`)
      return entries
    },

    /**
     * Update UI store with entries
     * NOTE: In Drizzle adapter, this is a no-op since we don't have a store
     * In production with Vue store, implement proper store update
     */
    updateStore: async (): Promise<void> => {
      console.log(`[DRIZZLE ADAPTER] 📦 Updating store (no-op in Drizzle adapter)`)
    }
  }
}
