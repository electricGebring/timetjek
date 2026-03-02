import { getDb } from '@/db/drizzle'
import { workEntries, type WorkEntry } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Capacitor } from '@capacitor/core'

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
 */
export async function upsertWorkEntry(entry: Partial<WorkEntry>) {
  console.debug('[DRIZZLE] 💾 Upserting work entry...')

  const db = getDb()

  const safeEntry = {
    ...entry,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString()
  }

  if (safeEntry.id !== null && safeEntry.id !== undefined) {
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
      // Insert with ID
      console.debug(`[DRIZZLE] ➕ Inserting entry with ID ${safeEntry.id}...`)

      await db.insert(workEntries).values({
        ...safeEntry
      } as WorkEntry)
    }
  } else {
    // Insert with auto-ID
    console.debug('[DRIZZLE] ➕ Inserting entry with auto-ID...')

    const { id, ...withoutId } = safeEntry

    await db.insert(workEntries).values({
      ...withoutId
    } as WorkEntry)
  }

  console.debug('[DRIZZLE] ✅ Upsert complete')

  // Save to localStorage after write (web only)
  saveDatabase()
}
