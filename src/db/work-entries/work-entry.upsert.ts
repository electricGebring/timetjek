import { getDb, type Database } from '@/db/drizzle'

import { workEntries, type WorkEntry } from '@/db/schema'

import { createLogger } from '@/utils/logger'

import { eq } from 'drizzle-orm'

import { Capacitor } from '@capacitor/core'

import { createLocalWorkEntryId } from './work-entry.helpers'

const logger = createLogger('WorkEntriesRepo')

/**
 * Save database to localStorage (web only)
 */
function saveDatabase(skip?: boolean) {
  if (skip) return

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
 * Insert or update a work entry using Drizzle ORM.
 * Accepts WorkEntry (DB), Entry (view with boolean meal fields), or Record.
 * Coerces meal_benefit booleans to 0|1 for DB.
 * @param tx - Optional transaction client (when provided, skipSave is implied)
 */
export async function upsertWorkEntry(entry: Partial<WorkEntry> | Record<string, unknown>, tx?: Database) {
  logger.log('[4. PERSIST][DRIZZLE] 💾 Upserting work entry...')

  const db = tx ?? getDb()

  const raw = entry as Record<string, unknown>

  const trimmedId = typeof raw.id === 'string' ? raw.id.trim() : undefined

  const mealBreakfast: number =
    typeof raw.meal_benefit_has_breakfast === 'boolean'
      ? raw.meal_benefit_has_breakfast
        ? 1
        : 0
      : Number(raw.meal_benefit_has_breakfast) || 0

  const mealLunch: number =
    typeof raw.meal_benefit_has_lunch === 'boolean'
      ? raw.meal_benefit_has_lunch
        ? 1
        : 0
      : Number(raw.meal_benefit_has_lunch) || 0

  const now = new Date().toISOString()

  const safeEntry = {
    ...raw,
    id: typeof trimmedId === 'string' && trimmedId.length > 0 ? trimmedId : createLocalWorkEntryId(),
    meal_benefit_has_breakfast: mealBreakfast,
    meal_benefit_has_lunch: mealLunch,
    createdAt: (typeof raw.createdAt === 'string' ? raw.createdAt : null) ?? now,
    updatedAt: (typeof raw.updatedAt === 'string' ? raw.updatedAt : null) ?? now
  } as Record<string, unknown> & { id: string; createdAt: string; updatedAt: string }

  // Check if row exists
  const existing = await db.select().from(workEntries).where(eq(workEntries.id, safeEntry.id))

  if (existing.length > 0) {
    logger.log(`[4. PERSIST][DRIZZLE] 🔄 Updating entry ${safeEntry.id}...`)

    await db
      .update(workEntries)
      .set({
        ...safeEntry
      })
      .where(eq(workEntries.id, safeEntry.id))
  }
 else {
    logger.log(`[4. PERSIST][DRIZZLE] ➕ Inserting entry with ID ${safeEntry.id}...`)

    await db.insert(workEntries).values({
      ...safeEntry
    } as unknown as WorkEntry)
  }

  logger.log('[4. PERSIST][DRIZZLE] ✅ Upsert complete')

  // Save to localStorage after write (web only)
  saveDatabase(!!tx)
}
