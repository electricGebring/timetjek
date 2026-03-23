import { getDb } from '@/db/drizzle'

import { workEntries } from '@/db/schema'

import { eq, inArray } from 'drizzle-orm'

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
 * Soft delete a work entry (marks as deleted but keeps data)
 */
export async function softDeleteWorkEntry(id: string) {
  console.debug(`[DRIZZLE] 🗑️  Soft-deleting entry ${id}...`)

  const now = new Date().toISOString()

  await getDb()
    .update(workEntries)
    .set({
      deleted: 1,
      deleted_at: now,
      updatedAt: now
    })
    .where(eq(workEntries.id, id))

  console.debug('[DRIZZLE] ✅ Soft-delete complete')

  saveDatabase()
}

/**
 * Restore a soft-deleted work entry
 */
export async function restoreWorkEntry(id: string) {
  console.debug(`[DRIZZLE] ♻️  Restoring entry ${id}...`)

  await getDb()
    .update(workEntries)
    .set({
      deleted: 0,
      deleted_at: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(workEntries.id, id))

  console.debug('[DRIZZLE] ✅ Restore complete')

  saveDatabase()
}

/**
 * Mark a work entry as dirty (unsynced) when a child (e.g. break) changes.
 * Used for aggregation sync: child mutations propagate to parent so the
 * aggregate is re-pushed on next sync.
 */
export async function markParentEntryDirty(workEntryId: string) {
  console.debug(`[DRIZZLE] 📝 Marking parent entry ${workEntryId} as dirty (unsynced)...`)

  await getDb()
    .update(workEntries)
    .set({
      synced: 0,
      updatedAt: new Date().toISOString()
    })
    .where(eq(workEntries.id, workEntryId))

  console.debug('[DRIZZLE] ✅ Parent marked dirty')

  saveDatabase()
}

/**
 * Mark a work entry as synced with backend
 */
export async function markWorkEntryAsSynced(id: string) {
  console.debug(`[DRIZZLE] ☑️  Marking entry ${id} as synced...`)

  await getDb()
    .update(workEntries)
    .set({
      synced: 1,
      updatedAt: new Date().toISOString()
    })
    .where(eq(workEntries.id, id))

  console.debug('[DRIZZLE] ✅ Sync mark complete')

  saveDatabase()
}

/**
 * Permanently delete a work entry from database
 */
export async function permanentDeleteWorkEntry(id: string) {
  console.debug(`[DRIZZLE] 💀 Permanently deleting entry ${id}...`)

  await getDb().delete(workEntries).where(eq(workEntries.id, id))

  console.debug('[DRIZZLE] ✅ Permanent delete complete')

  saveDatabase()
}

/**
 * Mark multiple entries as synced after successful API push
 */
export async function markEntriesAsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const now = new Date().toISOString()

  await getDb().update(workEntries).set({ synced: 1, updatedAt: now }).where(inArray(workEntries.id, ids))

  saveDatabase()
}

/**
 * Permanently delete multiple entries after successful delete on API
 */
export async function deletePermanently(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  await getDb().delete(workEntries).where(inArray(workEntries.id, ids))

  saveDatabase()
}
