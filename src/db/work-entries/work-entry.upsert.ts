import { getDb } from '@/db/drizzle'
import { workEntries, type WorkEntry as DrizzleWorkEntry } from '@/db/schema'
import type { WorkEntry } from '@/models/work-entry.schema'
import { eq } from 'drizzle-orm'
import { Capacitor } from '@capacitor/core'
import { createLocalWorkEntryId } from './work-entry.helpers'

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
 * Insert or update a work entry using Drizzle ORM
 * Accepts both Drizzle WorkEntry and Zod WorkEntry formats
 */
export async function upsertWorkEntry(entry: Partial<WorkEntry> | Partial<DrizzleWorkEntry> | Record<string, unknown>) {
  console.debug('[DRIZZLE] 💾 Upserting work entry...')

  const db = getDb()
  const trimmedId = typeof entry.id === 'string' ? entry.id.trim() : undefined

  const safeEntry = {
    ...entry,
    id:
      typeof trimmedId === 'string' && trimmedId.length > 0
        ? trimmedId
        : createLocalWorkEntryId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString()
  } as Record<string, unknown> & { id: string; createdAt: string; updatedAt: string }

  // Check if row exists
  const existing = await db
    .select()
    .from(workEntries)
    .where(eq(workEntries.id, safeEntry.id))

  if (existing.length > 0) {
    // Update existing
    console.debug(`[DRIZZLE] 🔄 Updating entry ${safeEntry.id}...`)

    await db
      .update(workEntries)
      .set({
        ...safeEntry,
        updatedAt: new Date().toISOString()
      })
      .where(eq(workEntries.id, safeEntry.id))
  } else {
    // Insert with UUID ID
    console.debug(`[DRIZZLE] ➕ Inserting entry with ID ${safeEntry.id}...`)

    await db.insert(workEntries).values({
      ...safeEntry
    } as unknown as DrizzleWorkEntry)
  }

  console.debug('[DRIZZLE] ✅ Upsert complete')

  // Save to localStorage after write (web only)
  saveDatabase()
}
