import { getDb } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import type { WorkEntryBreak, CreateWorkEntryBreakInput } from '@/models/work-entry-break.schema'
import { createLogger } from '@/utils/logger'
import { markParentEntryDirty } from '@/db/work-entries/repo'
import { createLocalWorkEntryId } from '@/db/work-entries/work-entry.helpers'

const logger = createLogger('WorkEntryBreaksRepo')

/**
 * Insert a single break for a work entry
 */
export async function insertBreak(workEntryId: string, breakData: CreateWorkEntryBreakInput): Promise<WorkEntryBreak> {
  logger.log('[CREATE] Inserting break for work entry:', workEntryId)

  const db = getDb()
  const id = createLocalWorkEntryId()

  const result = await db
    .insert(workEntryBreaks)
    .values({
      id,
      work_entry_id: workEntryId,
      start_at: breakData.start_at ?? null,
      end_at: breakData.end_at ?? null,
      start_exact_at: breakData.start_exact_at ?? null,
      end_exact_at: breakData.end_exact_at ?? null,
      created_at: new Date().toISOString()
    })
    .returning()

  logger.log('[CREATE] Break inserted:', result[0])

  await markParentEntryDirty(workEntryId)

  return result[0] as WorkEntryBreak
}

/**
 * Insert multiple breaks at once (for sync/import)
 */
export async function insertManyBreaks(
  breaks: Array<CreateWorkEntryBreakInput & { work_entry_id: string; id?: string }>
): Promise<void> {
  if (breaks.length === 0) return

  logger.log(`[CREATE] Inserting ${breaks.length} breaks`)

  const db = getDb()

  await db.insert(workEntryBreaks).values(
    breaks.map((b) => ({
      id: b.id ?? createLocalWorkEntryId(),
      work_entry_id: b.work_entry_id,
      start_at: b.start_at ?? null,
      end_at: b.end_at ?? null,
      start_exact_at: b.start_exact_at ?? null,
      end_exact_at: b.end_exact_at ?? null,
      created_at: new Date().toISOString()
    }))
  )

  const workEntryIds = [...new Set(breaks.map((b) => b.work_entry_id))]
  for (const workEntryId of workEntryIds) {
    await markParentEntryDirty(workEntryId)
  }

  logger.log('[CREATE] Breaks inserted successfully')
}
