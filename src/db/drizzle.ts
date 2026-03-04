import { drizzle as drizzleSqlJs } from 'drizzle-orm/sql-js'

import * as schema from './schema'

import type { Database as SqlJsDatabase } from 'sql.js'

let dbInstance: unknown = null
let rawSqlite: unknown = null // Raw better-sqlite3 instance for Node.js

/**
 * Initialize Drizzle database instance
 * 
 * For browser/Vue app: Use sql.js database (pass existing sql.js instance)
 * For Node.js tests: Use better-sqlite3 (pass file path string)
 */
export async function initDrizzle(dbOrPath: string | SqlJsDatabase) {
  if (dbInstance) {
    return dbInstance
  }

  // If passed a string, assume it's a file path for better-sqlite3 (Node.js)
  if (typeof dbOrPath === 'string') {
    // Dynamic import to avoid bundling for browser
    const { drizzle: drizzleBetterSqlite } = await import('drizzle-orm/better-sqlite3')
    
    const Database = (await import('better-sqlite3')).default
    
    rawSqlite = new Database(dbOrPath)
    
    dbInstance = drizzleBetterSqlite(rawSqlite, { schema })
  } 
  // Otherwise assume it's a sql.js database instance (browser)
  else {
    dbInstance = drizzleSqlJs(dbOrPath, { schema })
  }

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
 * Get the raw sqlite3 instance (Node.js only)
 */
export function getRawSqlite() {
  if (!rawSqlite) {
    throw new Error('Raw sqlite not available (only in Node.js)')
  }
  return rawSqlite as { prepare: (sql: string) => { run: (...params: unknown[]) => void, all: (...params: unknown[]) => unknown[] } }
}

/**
 * Reset database instance (useful for tests)
 */
export function resetDb() {
  dbInstance = null
}

export type Database = ReturnType<typeof drizzleSqlJs>

export * from './schema'

