import { getDb } from '@/db/drizzle'
import { workEntries, type WorkEntry } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

/**
 * Get all non-deleted work entries
 */
export async function getWorkEntries(): Promise<WorkEntry[]> {
  console.debug('[DRIZZLE] 🔍 Fetching all work entries...')

  const entries = await getDb()
    .select()
    .from(workEntries)
    .where(and(eq(workEntries.deleted, 0), isNull(workEntries.deleted_at)))

  console.debug(`[DRIZZLE] ✅ Found ${entries.length} entries`)

  return entries
}

/**
 * Get unsynced work entries for outbox drain
 */
export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  console.debug('[DRIZZLE] 📤 Fetching unsynced entries...')

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

  console.debug(`[DRIZZLE] ✅ Found ${entries.length} unsynced entries`)

  return entries
}

/**
 * Get soft-deleted entries that need to be synced
 */
export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  console.debug('[DRIZZLE] 🗑️  Fetching deleted entries...')

  const entries = await getDb()
    .select()
    .from(workEntries)
    .where(and(eq(workEntries.deleted, 1), eq(workEntries.synced, 0)))

  console.debug(`[DRIZZLE] ✅ Found ${entries.length} deleted entries`)

  return entries
}
