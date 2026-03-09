import { getDb } from '@/db/drizzle'
import { workEntryBreaks } from '@/db/schema'
import type { WorkEntryBreak } from '@/models/work-entry-break.schema'
import { parseWorkEntryBreakRow } from '@/models/work-entry-break.schema'
import { eq } from 'drizzle-orm'

/**
 * Get all breaks for a specific work entry
 */
export async function getBreaksByWorkEntryId(workEntryId: string): Promise<WorkEntryBreak[]> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks).where(eq(workEntryBreaks.work_entry_id, workEntryId))

  return results.map((row) => parseWorkEntryBreakRow(row as Record<string, unknown>))
}

/**
 * Get a single break by its ID
 */
export async function getBreakById(id: string): Promise<WorkEntryBreak | null> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks).where(eq(workEntryBreaks.id, id))

  if (results.length === 0) {
    return null
  }

  return parseWorkEntryBreakRow(results[0] as Record<string, unknown>)
}

/**
 * Get all breaks (for debugging/admin)
 */
export async function getAllBreaks(): Promise<WorkEntryBreak[]> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks)

  return results.map((row) => parseWorkEntryBreakRow(row as Record<string, unknown>))
}
