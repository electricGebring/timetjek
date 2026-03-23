import { drizzle as drizzleSqlJs } from 'drizzle-orm/sql-js'

import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'

import * as schema from './schema'

type SqlJsDatabase = import('sql.js').Database

type SqliteProxyMethod = 'run' | 'all' | 'values' | 'get'

type NativeRow = Record<string, unknown>

export type CapacitorDB = {
  run: (sql: string, params?: unknown[]) => Promise<unknown>
  query: (sql: string, params?: unknown[]) => Promise<{ values?: NativeRow[] }>
}

type ColumnMetadataRow = { ios_columns: string[] }

function isIosColumnsRow(row: unknown): row is ColumnMetadataRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'ios_columns' in row &&
    Array.isArray((row as { ios_columns?: unknown }).ios_columns)
  )
}

function normalizeNativeRows(values: unknown[]): { rows: unknown[][]; firstRow: unknown[] | undefined } {
  const metadataRow = values.find((row) => isIosColumnsRow(row)) as ColumnMetadataRow | undefined

  const dataRows = values.filter((row) => {
    if (isIosColumnsRow(row)) {
      return false
    }

    return typeof row === 'object' && row !== null
  }) as NativeRow[]

  if (dataRows.length === 0) {
    return { rows: [], firstRow: undefined }
  }

  const columns = metadataRow?.ios_columns ?? Object.keys(dataRows[0] ?? {})

  const rows = dataRows.map((row) => columns.map((column) => row[column]))

  return { rows, firstRow: rows[0] }
}

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
 * Initialize Drizzle database instance with Capacitor SQLite (native iOS/Android)
 */
export async function initDrizzleCapacitor(db: CapacitorDB) {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = drizzleProxy(
    async (sql: string, params: unknown[], method: SqliteProxyMethod) => {
      if (method === 'run') {
        await db.run(sql, params)

        return { rows: [] }
      }

      const result = await db.query(sql, params)

      const values = result.values ?? []

      const normalized = normalizeNativeRows(values)

      if (method === 'get') {
        return { rows: normalized.firstRow ? [...normalized.firstRow] : [] }
      }

      return { rows: normalized.rows }
    },
    { schema }
  )

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

  const { Capacitor } = await import('@capacitor/core')

  // On native Capacitor, SQLite already runs inside its own transaction context.
  // Calling db.transaction() would issue a BEGIN which causes "cannot start a
  // transaction within a transaction". So we call fn directly on native.
  if (Capacitor.isNativePlatform()) {
    return fn(db)
  }

  const result = await db.transaction(fn)

  // Persist to localStorage after commit (web only)
  try {
    const { getDB } = await import('./index')

    const g = getDB() as { saveDatabase?: () => void }

    g.saveDatabase?.()
  }
  catch {
    // Ignore if not in web context
  }

  return result
}

export * from './schema'
