// --- Modern migration runner for native + web ---
// Now uses Drizzle Kit for schema management - migrations in drizzle/ folder
import { Capacitor } from '@capacitor/core'

import { getDB } from './index'

// Legacy manually written migrations (kept for backwards compatibility)
import migration_001 from '../../migrations/20260128_001_create_work_entries.sql?raw'

import migration_003 from '../../migrations/20260205_002_upgrade_work_entries.sql?raw'

import migration_004 from '../../migrations/20260205_001_add_total_break_seconds.sql?raw'

type Migration = { id: string; sql: string }

let migrations: Migration[] = []

if (typeof window === 'undefined') {
  // Node.js: use fs
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path')

  // Legacy migrations (already applied in existing DBs)
  const legacyMigrations = [
    {
      id: '20260128_001_create_work_entries',
      sql: fs.readFileSync('migrations/20260128_001_create_work_entries.sql', 'utf-8')
    },
    {
      id: '20260205_002_upgrade_work_entries',
      sql: fs.readFileSync('migrations/20260205_002_upgrade_work_entries.sql', 'utf-8')
    },
    {
      id: '20260205_001_add_total_break_seconds',
      sql: fs.readFileSync('migrations/20260205_001_add_total_break_seconds.sql', 'utf-8')
    }
  ]

  // Read Drizzle-generated migrations from drizzle/ folder (future schema changes)
  const drizzlePath = path.join(process.cwd(), 'drizzle')
  const drizzleFiles = fs.existsSync(drizzlePath) 
    ? fs.readdirSync(drizzlePath).filter((f: string) => f.endsWith('.sql')).sort() 
    : []
  const drizzleMigrations = drizzleFiles.map((file: string) => ({
    id: `drizzle_${file.replace('.sql', '')}`,
    sql: fs.readFileSync(path.join(drizzlePath, file), 'utf-8')
  }))

  migrations = [...legacyMigrations, ...drizzleMigrations]
}
 else {
  // Web/Vite: use imported SQL strings
  // Note: New Drizzle migrations need to be manually imported here for web builds
  migrations = [
    { id: '20260128_001_create_work_entries', sql: migration_001 },
    { id: '20260205_002_upgrade_work_entries', sql: migration_003 },
    { id: '20260205_001_add_total_break_seconds', sql: migration_004 }
    // Future Drizzle-generated migrations will be added here
  ]
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
  if (Capacitor.isNativePlatform()) {
    const db = getDB() as { run: (sql: string, params?: unknown[]) => Promise<void> }

    await db.run(sql, params)
  }
 else {
    const { sqlJsDb } = getDB() as { sqlJsDb: { run: (sql: string, params?: unknown[]) => void } }

    sqlJsDb.run(sql, params)
  }
}

async function queryRows(sql: string, params: unknown[] = []): Promise<unknown[][]> {
  if (Capacitor.isNativePlatform()) {
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
  if (!Capacitor.isNativePlatform()) {
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
