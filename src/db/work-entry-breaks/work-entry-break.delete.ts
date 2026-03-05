import { getDb } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import { createLogger } from '@/utils/logger'
import { eq } from 'drizzle-orm'

const logger = createLogger('WorkEntryBreaksRepo')

/**
 * Delete a single break by its ID
 */
export async function deleteBreak(id: number): Promise<void> {
  logger.log('[DELETE] Deleting break:', id)

  const db = getDb()

  await db.delete(workEntryBreaks).where(eq(workEntryBreaks.id, id))

  logger.log('[DELETE] Break deleted')
}

/**
 * Delete all breaks for a specific work entry
 * NOTE: This is usually not needed because of ON DELETE CASCADE,
 * but provided for manual cleanup if needed
 */
export async function deleteBreaksByWorkEntryId(workEntryId: string): Promise<void> {
  logger.log('[DELETE] Deleting all breaks for work entry:', workEntryId)

  const db = getDb()

  await db.delete(workEntryBreaks).where(eq(workEntryBreaks.work_entry_id, workEntryId))

  logger.log('[DELETE] Breaks deleted')
}
