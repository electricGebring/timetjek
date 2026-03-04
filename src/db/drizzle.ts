import { drizzle as drizzleSqlJs } from 'drizzle-orm/sql-js'

import * as schema from './schema'

import type { Database as SqlJsDatabase } from 'sql.js'

let dbInstance: unknown = null

type BetterSqliteDatabase = {
  prepare: (sql: string) => { all: () => Array<Record<string, unknown>> }
  exec: (sql: string) => void
}

function ensureWorkEntriesUuidSchema(sqlite: BetterSqliteDatabase) {
  const tableInfo = sqlite.prepare('PRAGMA table_info(work_entries)').all()

  if (tableInfo.length === 0) {
    return
  }

  const idColumn = tableInfo.find((c) => String(c.name) === 'id')
  const idType = String(idColumn?.type ?? '').toUpperCase()
  const hasRemoteId = tableInfo.some((c) => String(c.name) === 'remote_id')

  if (!hasRemoteId) {
    try {
      sqlite.exec('ALTER TABLE work_entries ADD COLUMN remote_id TEXT')
    } catch {
      // no-op
    }
  }

  if (idType.includes('INT')) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS work_entries_uuid_tmp (
        id TEXT PRIMARY KEY,
        remote_id TEXT,
        employee_id INTEGER,
        workplace_id INTEGER,
        cost_center_id INTEGER,
        work_day_id INTEGER,
        status TEXT DEFAULT 'OPEN',
        check_in_at TEXT,
        check_in_time_at TEXT,
        check_in_latitude REAL,
        check_in_longitude REAL,
        check_in_application TEXT DEFAULT 'APP',
        check_out_at TEXT,
        check_out_time_at TEXT,
        check_out_latitude REAL,
        check_out_longitude REAL,
        check_out_application TEXT,
        break TEXT,
        meal_benefit_has_breakfast INTEGER DEFAULT 0,
        meal_benefit_has_lunch INTEGER DEFAULT 0,
        name TEXT,
        type TEXT,
        personalNumber TEXT,
        administrator_comment TEXT,
        total_working_seconds INTEGER,
        total_break_seconds INTEGER,
        hasError INTEGER DEFAULT 0,
        updatedBy TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        deleted_at TEXT,
        synced INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0
      );

      INSERT INTO work_entries_uuid_tmp (
        id, remote_id, employee_id, workplace_id, cost_center_id, work_day_id, status,
        check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application,
        check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application,
        break, meal_benefit_has_breakfast, meal_benefit_has_lunch,
        name, type, personalNumber, administrator_comment,
        total_working_seconds, total_break_seconds, hasError, updatedBy,
        createdAt, updatedAt, deleted_at, synced, deleted
      )
      SELECT
        CAST(id AS TEXT),
        remote_id,
        employee_id, workplace_id, cost_center_id, work_day_id, status,
        check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application,
        check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application,
        break, meal_benefit_has_breakfast, meal_benefit_has_lunch,
        name, type, personalNumber, administrator_comment,
        total_working_seconds, total_break_seconds, hasError, updatedBy,
        createdAt, updatedAt, deleted_at, synced, deleted
      FROM work_entries;

      DROP TABLE work_entries;
      ALTER TABLE work_entries_uuid_tmp RENAME TO work_entries;
    `)
  }
}

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
    
    const sqlite = new Database(dbOrPath)

    // Lightweight compatibility patch for legacy local test DBs.
    // Main app schema evolution is handled by migration runner.
    ensureWorkEntriesUuidSchema(sqlite as unknown as BetterSqliteDatabase)
    
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
 * Reset database instance (useful for tests)
 */
export function resetDb() {
  dbInstance = null
}

export type Database = ReturnType<typeof drizzleSqlJs>

export * from './schema'

