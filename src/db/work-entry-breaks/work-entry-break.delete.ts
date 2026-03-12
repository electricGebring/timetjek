import { getDb, type Database } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import { createLogger } from '@/utils/logger'
import { eq } from 'drizzle-orm'
import { Capacitor } from '@capacitor/core'
import { markParentEntryDirty } from '@/db/work-entries/repo'
import { getBreakById } from './work-entry-break.read'

const logger = createLogger('WorkEntryBreaksRepo')

function saveDatabase(skip?: boolean) {
  if (skip) return
  if (!Capacitor.isNativePlatform()) {
    import('@/db/index').then(({ getDB }) => {
      const db = getDB() as { saveDatabase?: () => void }
      db.saveDatabase?.()
    })
  }
}

/**
 * Soft delete a break (marks deleted=1, keeps row for sync).
 * Marks parent entry dirty for aggregation sync.
 */
export async function deleteBreak(id: string): Promise<void> {
  logger.log('[DELETE] Soft-deleting break:', id)

  const breakRecord = await getBreakById(id)
  const workEntryId = breakRecord?.work_entry_id

  const now = new Date().toISOString()

  await getDb()
    .update(workEntryBreaks)
    .set({ deleted: 1, deleted_at: now, synced: 0 })
    .where(eq(workEntryBreaks.id, id))

  if (workEntryId) {
    await markParentEntryDirty(workEntryId)
  }

  saveDatabase()
  logger.log('[DELETE] Break soft-deleted')
}

/**
 * Permanently delete a break from the database.
 * Call after successful API delete.
 * @param id - Break ID
 * @param tx - Optional transaction client (when provided, skipSave is implied)
 */
export async function permanentDeleteBreak(id: string, tx?: Database): Promise<void> {
  logger.log('[DELETE] Permanently deleting break:', id)

  const db = tx ?? getDb()
  await db.delete(workEntryBreaks).where(eq(workEntryBreaks.id, id))

  saveDatabase(!!tx)
  logger.log('[DELETE] Break permanently deleted')
}

/**
 * Mark a break as synced with backend
 */
export async function markBreakAsSynced(id: string): Promise<void> {
  await getDb().update(workEntryBreaks).set({ synced: 1 }).where(eq(workEntryBreaks.id, id))
  saveDatabase()
}

/**
 * Mark multiple breaks as synced.
 * If breakRemoteIdMap is provided (local_id -> server remote_id), also persists remote_id for each.
 * @param tx - Optional transaction client (when provided, skipSave is implied)
 */
export async function markBreaksAsSynced(
  ids: string[],
  breakRemoteIdMap?: Record<string, string>,
  tx?: Database
): Promise<void> {
  if (ids.length === 0) return
  const db = tx ?? getDb()
  for (const localId of ids) {
    const remoteId = breakRemoteIdMap?.[localId]
    await db
      .update(workEntryBreaks)
      .set(remoteId != null ? { synced: 1, remote_id: remoteId } : { synced: 1 })
      .where(eq(workEntryBreaks.id, localId))
  }
  saveDatabase(!!tx)
}

/**
 * Delete all breaks for a specific work entry
 * NOTE: This is usually not needed because of ON DELETE CASCADE,
 * but provided for manual cleanup if needed
 * @param markParentDirty - when true (default), marks the parent entry as unsynced.
 *   Set to false when applying remote state during pull (no local change to push)
 */
export async function deleteBreaksByWorkEntryId(workEntryId: string, markParentDirty = true): Promise<void> {
  logger.log('[DELETE] Deleting all breaks for work entry:', workEntryId)

  const db = getDb()

  await db.delete(workEntryBreaks).where(eq(workEntryBreaks.work_entry_id, workEntryId))

  if (markParentDirty) {
    await markParentEntryDirty(workEntryId)
  }

  logger.log('[DELETE] Breaks deleted')
}
