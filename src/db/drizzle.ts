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

export * from './schema'
