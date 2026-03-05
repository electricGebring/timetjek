import { Capacitor } from '@capacitor/core'

import { drizzle as drizzleSqlJs } from 'drizzle-orm/sql-js'

import * as schema from './schema'

type SqlJsDatabase = import('sql.js').Database

type BetterSqliteDatabase = import('better-sqlite3').Database

type RawSqlite = {
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void
    all: (...params: unknown[]) => unknown[]
  }
}

const isNativeRuntime = (() => {
  try {
    return Capacitor.isNativePlatform()
  }
 catch {
    return false
  }
})()

const isNodeRuntime =
  !isNativeRuntime &&
  typeof globalThis === 'object' &&
  'process' in globalThis &&
  typeof (globalThis as { process?: { versions?: { node?: unknown } } }).process?.versions?.node === 'string'

let dbInstance: unknown = null

let rawSqlite: RawSqlite | null = null // Raw better-sqlite3 instance for Node.js

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

    const sqlite = new Database(dbOrPath) as BetterSqliteDatabase

    rawSqlite = sqlite as unknown as RawSqlite

    dbInstance = drizzleBetterSqlite(sqlite, { schema })
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
  return rawSqlite
}

/**
 * Get raw sqlite instance and fail fast when unavailable.
 * Use only in Node.js execution paths.
 */
export function requireRawSqlite(): RawSqlite {
  if (!isNodeRuntime) {
    throw new Error(
      `Raw sqlite is only available in Node.js (current runtime: ${isNativeRuntime ? 'native' : 'web'})`
    )
  }

  const sqlite = getRawSqlite()

  if (!sqlite) {
    throw new Error('Raw sqlite is unavailable on this platform (expected Node.js with better-sqlite3)')
  }

  return sqlite
}

/**
 * Reset database instance (useful for tests)
 */
export function resetDb() {
  dbInstance = null

  rawSqlite = null
}

export type Database = ReturnType<typeof drizzleSqlJs>

export * from './schema'

