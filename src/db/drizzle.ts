import { drizzle as drizzleSqlJs } from 'drizzle-orm/sql-js'

import * as schema from './schema'

type SqlJsDatabase = import('sql.js').Database

let dbInstance: unknown = null

/**
 * Initialize Drizzle database instance with sql.js (browser)
 */
export async function initDrizzle(db: SqlJsDatabase) {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = drizzleSqlJs(db, { schema })

  return dbInstance
}

/**
 * Get the current Drizzle instance
 */
export function getDb(): ReturnType<typeof drizzleSqlJs> {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDrizzle first.')
  }

  return dbInstance as ReturnType<typeof drizzleSqlJs>
}

/**
 * Reset database instance (useful for tests)
 */
export function resetDb() {
  dbInstance = null
}

export type Database = ReturnType<typeof drizzleSqlJs>

/**
 * Run a callback inside a transaction. All DB operations in the callback use the same transaction.
 * Commits on success, rolls back on error. Persists to localStorage (web) after commit.
 */
export async function runInTransaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
  const db = getDb()

  const result = await db.transaction(fn)

  // Persist to localStorage after commit (web only)
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) {
      const { getDB } = await import('./index')
      const g = getDB() as { saveDatabase?: () => void }
      g.saveDatabase?.()
    }
  } catch {
    // Ignore if not in web context
  }

  return result
}

export * from './schema'
