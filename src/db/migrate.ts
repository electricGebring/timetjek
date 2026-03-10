// --- Drizzle ORM migration runner for native + web ---
// All schema changes now managed by Drizzle Kit - single source of truth
import { Capacitor } from '@capacitor/core'

import { getDB } from './index'

type Migration = { id: string; sql: string }

const isNativeRuntime = (() => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
})()

function isNodeProcessRuntime() {
  return (
    !isNativeRuntime &&
    typeof globalThis === 'object' &&
    'process' in globalThis &&
    typeof (globalThis as { process?: { versions?: { node?: unknown } } }).process?.versions?.node === 'string'
  )
}

let migrations: Migration[] = []

if (isNodeProcessRuntime()) {
  // Node.js: use fs to read all Drizzle migrations dynamically
  const { readFileSync, readdirSync, existsSync } = await import('fs')

  const { join } = await import('path')

  const { cwd } = await import('process')

  const drizzlePath = join(cwd(), 'drizzle')

  const drizzleFiles = existsSync(drizzlePath)
    ? readdirSync(drizzlePath)
        .filter((f: string) => f.endsWith('.sql'))
        .sort()
    : []

  migrations = drizzleFiles.map((file: string) => ({
    id: `0_drizzle_${file.replace('.sql', '')}`,
    sql: readFileSync(join(drizzlePath, file), 'utf-8')
  }))
} else {
  // Web/Vite: use dynamic imports for SQL files (Vite supports ?raw)
  // This will be populated at build time by Vite's static analysis
  const drizzleModules = import.meta.glob('../../drizzle/*.sql', { query: '?raw', eager: true })

  migrations = Object.entries(drizzleModules)
    .map(([path, mod]) => {
      const fileName = path.split('/').pop()?.replace('.sql', '') || ''
      return {
        id: `0_drizzle_${fileName}`,
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
      } else if (typeof r === 'object' && r !== null) {
        return String((r as unknown as { id: string }).id)
      }

      return String(r)
    })
  )
}

async function runSql(sql: string, params: unknown[] = []) {
  if (isNativeRuntime) {
    const db = getDB() as { run: (sql: string, params?: unknown[]) => Promise<void> }

    await db.run(sql, params)
  } else {
    const { sqlJsDb } = getDB() as { sqlJsDb: { run: (sql: string, params?: unknown[]) => void } }

    sqlJsDb.run(sql, params)
  }
}

async function queryRows(sql: string, params: unknown[] = []): Promise<unknown[][]> {
  if (isNativeRuntime) {
    const db = getDB() as { query: (sql: string, params?: unknown[]) => Promise<{ values?: unknown[][] }> }

    const res = await db.query(sql, params)

    // Filter out metadata rows that have 'ios_columns' or similar keys
    const values = (res.values ?? []).filter((row: unknown) => {
      return !(typeof row === 'object' && row !== null && 'ios_columns' in row && Object.keys(row).length === 1)
    })

    return values as unknown[][]
  } else {
    const { sqlJsDb } = getDB() as { sqlJsDb: { exec: (sql: string, params?: unknown[]) => { values: unknown[][] }[] } }

    const results = sqlJsDb.exec(sql, params)

    if (results.length === 0 || !results[0] || !('values' in results[0])) return []

    return (results[0].values ?? []) as unknown[][]
  }
}

async function saveIfWeb() {
  if (isNativeRuntime) {
    return
  }

  const { saveDatabase } = getDB() as { saveDatabase: () => void }

  saveDatabase()
}

export async function runMigrations() {
  await ensureMigrationsTable()

  const applied = await getAppliedMigrationIds()

  const pending = migrations.filter((m) => !applied.has(m.id))

  for (const m of pending) {
    console.debug('[MIGRATIONS] Applying migration:', m.id)

    try {
      await runSql('BEGIN TRANSACTION')

      // Split multiple statements (Drizzle uses --> statement-breakpoint or ;)
      const statements = m.sql
        .replace(/--> statement-breakpoint/g, ';')
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0)

      for (const stmt of statements) {
        await runSql(stmt)
      }

      await runSql('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [m.id, new Date().toISOString()])

      await runSql('COMMIT')
      console.debug('[MIGRATIONS] Migration applied:', m.id)
    } catch (e) {
      await runSql('ROLLBACK').catch(() => {})
      throw new Error(`Migration failed: ${m.id} -> ${(e as Error).message}`)
    }
  }

  if (pending.length === 0) {
    console.debug('[MIGRATIONS] No new migrations to apply')
  } else {
    console.debug('[MIGRATIONS] All migrations applied')
  }

  await saveIfWeb()
}
