import { getDb } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import { createLogger } from '@/utils/logger'
import { eq } from 'drizzle-orm'
import { markParentEntryDirty } from '@/db/work-entries/repo'
import { getBreakById } from './work-entry-break.read'

const logger = createLogger('WorkEntryBreaksRepo')

/**
 * Delete a single break by its ID
 */
export async function deleteBreak(id: string): Promise<void> {
  logger.log('[DELETE] Deleting break:', id)

  const breakRecord = await getBreakById(id)
  const workEntryId = breakRecord?.work_entry_id

  const db = getDb()

  await db.delete(workEntryBreaks).where(eq(workEntryBreaks.id, id))

  if (workEntryId) {
    await markParentEntryDirty(workEntryId)
  }

  logger.log('[DELETE] Break deleted')
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
