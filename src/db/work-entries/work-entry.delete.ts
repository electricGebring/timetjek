import { getDb } from '@/db/drizzle'
import { workEntries } from '@/db/schema'
import { eq } from 'drizzle-orm'
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
export async function softDeleteWorkEntry(id: number) {
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
export async function restoreWorkEntry(id: number) {
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
 * Mark a work entry as synced with backend
 */
export async function markWorkEntryAsSynced(id: number) {
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
export async function permanentDeleteWorkEntry(id: number) {
  console.debug(`[DRIZZLE] 💀 Permanently deleting entry ${id}...`)

  await getDb().delete(workEntries).where(eq(workEntries.id, id))

  console.debug('[DRIZZLE] ✅ Permanent delete complete')
  saveDatabase()
}
