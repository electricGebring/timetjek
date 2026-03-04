/**
 * Drizzle ORM queries for sync operations
 * Used by SyncEngine to drain outbox and handle deleted items
 * 
 * These queries are optimized for bulk operations and use Drizzle's
 * type-safe query builder for maximum maintainability.
 */

import { getDb } from '@/db/drizzle'

import { workEntries, type WorkEntry } from '@/db/schema'

import { and, eq, isNull, inArray } from 'drizzle-orm'

import { Capacitor } from '@capacitor/core'

/**
 * Save database to localStorage (web only)
 */
function saveDatabase() {
  if (!Capacitor.isNativePlatform()) {
    import('@/db/index').then(({ getDB }) => {
      const db = getDB() as { saveDatabase: () => void }

      if (db.saveDatabase) {
        db.saveDatabase()
      }
    })
  }
}

/**
 * Get all unsynced entries for draining the outbox
 * Used by SyncEngine to push changes to backend
 */
export async function getUnsyncedForSync(): Promise<WorkEntry[]> {
  console.debug('[DRIZZLE SYNC] 📤 Fetching unsynced entries for sync...')

  const entries = await getDb()
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.synced, 0),
        eq(workEntries.deleted, 0),
        isNull(workEntries.deleted_at)
      )
    )

  console.debug(`[DRIZZLE SYNC] ✅ Found ${entries.length} unsynced entries`)

  return entries
}

/**
 * Get all soft-deleted entries for deletion sync
 * After successful delete on API, these are permanently deleted locally
 */
export async function getDeletedForSync(): Promise<WorkEntry[]> {
  console.debug('[DRIZZLE SYNC] 🗑️  Fetching deleted entries for sync...')

  const entries = await getDb()
    .select()
    .from(workEntries)
    .where(
      and(
        eq(workEntries.deleted, 1),
        eq(workEntries.synced, 0)
      )
    )

  console.debug(`[DRIZZLE SYNC] ✅ Found ${entries.length} deleted entries`)

  return entries
}

/**
 * Mark multiple entries as synced after successful API push
 * Called after successfully upserting items on backend
 */
export async function markEntriesAsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  console.debug(`[DRIZZLE SYNC] ☑️  Marking ${ids.length} entries as synced...`)

  const now = new Date().toISOString()

  await getDb()
    .update(workEntries)
    .set({
      synced: 1,
      updatedAt: now
    })
    .where(inArray(workEntries.id, ids))

  console.debug('[DRIZZLE SYNC] ✅ Sync mark complete')

  saveDatabase()
}

/**
 * Permanently delete entries after successful delete on API
 * Called after successfully deleting items on backend
 */
export async function deletePermanently(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  console.debug(`[DRIZZLE SYNC] 💀 Permanently deleting ${ids.length} entries...`)

  await getDb()
    .delete(workEntries)
    .where(inArray(workEntries.id, ids))

  console.debug('[DRIZZLE SYNC] ✅ Permanent delete complete')

  saveDatabase()
}

/**
 * Merge remote changes into local database
 * Called during pull phase of sync to upsert server data
 * Uses the provided conflict resolution strategy
 */
export async function mergeRemoteEntries(
  remoteEntries: WorkEntry[],
  conflictResolution: 'last-write-wins' | 'local-wins' | 'remote-wins'
): Promise<void> {
  if (remoteEntries.length === 0) return

  console.debug(
    `[DRIZZLE SYNC] 🔀 Merging ${remoteEntries.length} remote entries (strategy: ${conflictResolution})...`
  )

  const db = getDb()

  for (const remoteEntry of remoteEntries) {
    if (!remoteEntry.id) continue

    // Fetch local version
    const localEntries = await db
      .select()
      .from(workEntries)
      .where(eq(workEntries.id, remoteEntry.id))

    const localEntry = localEntries[0]

    // Decide whether to merge based on strategy
    let shouldUpsert = true

    if (localEntry) {
      switch (conflictResolution) {
        case 'last-write-wins':
          // Compare timestamps
          shouldUpsert =
            new Date(remoteEntry.updatedAt || 0).getTime() >
            new Date(localEntry.updatedAt || 0).getTime()

          break

        case 'local-wins':
          // Never overwrite local changes
          shouldUpsert = false

          break

        case 'remote-wins':
          // Always take remote
          shouldUpsert = true

          break
      }
    }

    // Upsert if needed
    if (shouldUpsert) {
      console.debug(`[DRIZZLE SYNC]   ↻ Upserting entry ${remoteEntry.id}`)

      await db
        .insert(workEntries)
        .values({
          ...remoteEntry,
          synced: 1 // Remote entries are considered synced
        })
        .onConflictDoUpdate({
          target: workEntries.id,
          set: {
            ...remoteEntry,
            updatedAt: new Date().toISOString()
          }
        })
    }
  }

  console.debug('[DRIZZLE SYNC] ✅ Merge complete')

  saveDatabase()
}

/**
 * Get sync metadata for a table
 * Returns last sync timestamp and sync status
 */
export async function getSyncMetadata(): Promise<{
  lastSyncAt: string | null
  isSyncing: boolean
}> {
  // This would query sync_metadata table (to be implemented)
  // For now, placeholder
  return {
    lastSyncAt: null,
    isSyncing: false
  }
}
