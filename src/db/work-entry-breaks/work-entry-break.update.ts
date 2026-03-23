import { getDb } from '@/db/drizzle'

import { workEntryBreaks } from '@/db/schema'

import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

import { createLogger } from '@/utils/logger'

import { eq } from 'drizzle-orm'

import { markParentEntryDirty } from '@/db/work-entries/repo'

const logger = createLogger('WorkEntryBreaksRepo')

export type UpdateBreakInput = Partial<Pick<WorkEntryBreak, 'start_at' | 'end_at' | 'start_exact_at' | 'end_exact_at'>>

/**
 * Update a break by ID.
 * Marks the parent work entry as dirty for aggregation sync.
 */
export async function updateBreak(id: string, changes: UpdateBreakInput): Promise<WorkEntryBreak | null> {
  logger.log('[UPDATE] Updating break:', id)

  const db = getDb()

  const results = await db
    .update(workEntryBreaks)
    .set({
      ...changes,
      start_at: changes.start_at ?? undefined,
      end_at: changes.end_at ?? undefined,
      start_exact_at: changes.start_exact_at ?? undefined,
      end_exact_at: changes.end_exact_at ?? undefined
    })
    .where(eq(workEntryBreaks.id, id))
    .returning()

  const updated = results[0] as WorkEntryBreak | undefined

  if (updated?.work_entry_id) {
    await markParentEntryDirty(updated.work_entry_id)
  }

  logger.log('[UPDATE] Break updated')

  return updated ?? null
}
