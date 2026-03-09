import { getDb } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { WorkEntryBreak } from '@/models/work-entry-break.schema'
import { createLogger } from '@/utils/logger'

const logger = createLogger('WorkEntryBreaksRepo')

/**
 * Update a break record
 */
export async function updateBreak(
  breakId: number,
  updates: Partial<Pick<WorkEntryBreak, 'start_at' | 'end_at' | 'start_exact_at' | 'end_exact_at'>>
): Promise<WorkEntryBreak> {
  logger.log('[UPDATE] Updating break:', breakId, updates)

  const db = getDb()

  const result = await db
    .update(workEntryBreaks)
    .set(updates)
    .where(eq(workEntryBreaks.id, breakId))
    .returning()

  if (!result[0]) {
    throw new Error(`Break with id ${breakId} not found`)
  }

  logger.log('[UPDATE] Break updated:', result[0])
  return result[0] as WorkEntryBreak
}
