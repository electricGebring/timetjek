// --- Drizzle ORM migration runner for native + web ---
// All schema changes now managed by Drizzle Kit - single source of truth
import { Capacitor } from '@capacitor/core'

import { getDB } from './index'
import { getRawSqlite } from './drizzle'

type Migration = { id: string; sql: string }

let migrations: Migration[] = []

if (typeof window === 'undefined') {
  // Node.js: use fs to read all Drizzle migrations dynamically
  const { readFileSync, readdirSync, existsSync } = await import('fs')
  const { join } = await import('path')
  const { cwd } = await import('process')

  const drizzlePath = join(cwd(), 'drizzle')
  const drizzleFiles = existsSync(drizzlePath) 
    ? readdirSync(drizzlePath).filter((f: string) => f.endsWith('.sql')).sort() 
    : []
  
  migrations = drizzleFiles.map((file: string) => ({
    id: `drizzle_${file.replace('.sql', '')}`,
    sql: readFileSync(join(drizzlePath, file), 'utf-8')
  }))
}
 else {
  // Web/Vite: use dynamic imports for SQL files (Vite supports ?raw)
  // This will be populated at build time by Vite's static analysis
  const drizzleModules = import.meta.glob('../../drizzle/*.sql', { query: '?raw', eager: true })
  
  migrations = Object.entries(drizzleModules)
    .map(([path, mod]) => {
      const fileName = path.split('/').pop()?.replace('.sql', '') || ''
      return {
        id: `drizzle_${fileName}`,
        sql: (mod as { default: string }).default
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

async function ensureMigrationsTable() {
  const sql = `CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`

  await runSql(sql)
}

async function getAppliedMigrationIds(): Promise<Set<string>> {
  const sql = 'SELECT id FROM schema_migrations'

  const rows = await queryRows(sql, [])

  // Handle both array format [["id"]] and object format [{"id":"value"}]
  return new Set(
    rows.map((r) => {
      if (Array.isArray(r)) {
        return String(r[0])
      }
 else if (typeof r === 'object' && r !== null) {
        return String((r as unknown as { id: string }).id)
      }

      return String(r)
    })
  )
}

async function runSql(sql: string, params: unknown[] = []) {
  // Node.js test environment with better-sqlite3
  if (typeof window === 'undefined') {
    const sqlite = getRawSqlite()
    sqlite.prepare(sql).run(...params)
  }
  else if (Capacitor.isNativePlatform()) {
    const db = getDB() as { run: (sql: string, params?: unknown[]) => Promise<void> }

    await db.run(sql, params)
  }
 else {
    const { sqlJsDb } = getDB() as { sqlJsDb: { run: (sql: string, params?: unknown[]) => void } }

    sqlJsDb.run(sql, params)
  }
}

async function queryRows(sql: string, params: unknown[] = []): Promise<unknown[][]> {
  // Node.js test environment with better-sqlite3
  if (typeof window === 'undefined') {
    const sqlite = getRawSqlite()
    const rows = sqlite.prepare(sql).all(...params)
    // Convert from object format [{id: 'x'}] to array format [['x']] for consistency
    return rows.map((row: unknown) => {
      if (typeof row === 'object' && row !== null) {
        return Object.values(row)
      }
      return [row]
    })
  }
  else if (Capacitor.isNativePlatform()) {
    const db = getDB() as { query: (sql: string, params?: unknown[]) => Promise<{ values?: unknown[][] }> }

    const res = await db.query(sql, params)

    // Filter out metadata rows that have 'ios_columns' or similar keys
    const values = (res.values ?? []).filter((row: unknown) => {
      return !(typeof row === 'object' && row !== null && 'ios_columns' in row && Object.keys(row).length === 1)
    })

    return values as unknown[][]
  }
 else {
    const { sqlJsDb } = getDB() as { sqlJsDb: { exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[] } }

    const results = sqlJsDb.exec(sql, params)

    if (results.length === 0 || !results[0] || !('values' in results[0])) return []

    return (results[0].values ?? []) as unknown[][]
  }
}

async function saveIfWeb() {
  if (typeof window === 'undefined') {
    // Node.js with better-sqlite3 - no saveDatabase needed
    return  }
  else if (!Capacitor.isNativePlatform()) {
    const { saveDatabase } = getDB() as { saveDatabase: () => void }

    saveDatabase()
  }
}

export async function runMigrations() {
  await ensureMigrationsTable()

  const applied = await getAppliedMigrationIds()

  const pending = migrations.filter((m) => !applied.has(m.id))

  for (const m of pending) {
    // eslint-disable-next-line no-console
    console.log('[MIGRATIONS] Applying migration:', m.id)

    try {
      // Split multiple statements and execute each individually
      const statements = m.sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0)

      for (const stmt of statements) {
        await runSql(stmt)
      }

      await runSql('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [m.id, new Date().toISOString()])

      // eslint-disable-next-line no-console
      console.log('[MIGRATIONS] Migration applied:', m.id)
    }
 catch (e) {
      throw new Error(`Migration failed: ${m.id} -> ${(e as Error).message}`)
    }
  }

  if (pending.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[MIGRATIONS] No new migrations to apply')
  }
 else {
    // eslint-disable-next-line no-console
    console.log('[MIGRATIONS] All migrations applied')
  }

  await saveIfWeb()
}
