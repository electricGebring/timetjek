// --- Modern migration runner for native + web ---
import { Capacitor } from '@capacitor/core'
import { getDB } from './index'

// Import SQL migrations at the top for Vite/web
import migration_001 from '../../migrations/20260128_001_create_work_entries.sql?raw'
import migration_002 from '../../migrations/20260201_001_add_outbox.sql?raw'
import migration_003 from '../../migrations/20260205_002_upgrade_work_entries.sql?raw'
import migration_004 from '../../migrations/20260205_001_add_total_break_seconds.sql?raw'

type Migration = { id: string, sql: string }
let migrations: Migration[] = []

if (typeof window === 'undefined') {
  // Node.js: use fs
  const fs = require('fs')
  migrations = [
    {
      id: '20260128_001_create_work_entries',
      sql: fs.readFileSync('migrations/20260128_001_create_work_entries.sql', 'utf-8')
    },
    {
      id: '20260201_001_add_outbox',
      sql: fs.readFileSync('migrations/20260201_001_add_outbox.sql', 'utf-8')
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
} else {
  // Web/Vite: use imported SQL strings
  migrations = [
    { id: '20260128_001_create_work_entries', sql: migration_001 },
    { id: '20260201_001_add_outbox', sql: migration_002 },
    { id: '20260205_002_upgrade_work_entries', sql: migration_003 },
    { id: '20260205_001_add_total_break_seconds', sql: migration_004 }
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
  return new Set(rows.map(r => String(r[0])))
}

async function runSql(sql: string, params: any[] = []) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run(sql, params)
  } else {
    const { sqlJsDb } = getDB() as any
    sqlJsDb.run(sql, params)
  }
}

async function queryRows(sql: string, params: any[] = []): Promise<any[][]> {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query(sql, params)
    return (res.values ?? []) as any[][]
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec(sql, params)
    if (results.length === 0) return []
    return results[0].values as any[][]
  }
}

async function saveIfWeb() {
  if (!Capacitor.isNativePlatform()) {
    const { saveDatabase } = getDB() as any
    saveDatabase()
  }
}

export async function runMigrations() {
  await ensureMigrationsTable()
  const applied = await getAppliedMigrationIds()
  const pending = migrations.filter(m => !applied.has(m.id))

  for (const m of pending) {
    console.log('[MIGRATIONS] Applying migration:', m.id)
    await runSql('BEGIN')
    try {
      await runSql(m.sql)
      await runSql(
        'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
        [m.id, new Date().toISOString()]
      )
      await runSql('COMMIT')
    } catch (e) {
      await runSql('ROLLBACK')
      throw new Error(`Migration failed: ${m.id} -> ${(e as Error).message}`)
    }
  }
  if (pending.length === 0) {
    console.log('[MIGRATIONS] No new migrations to apply')
  } else {
    console.log('[MIGRATIONS] All migrations applied')
  }
  await saveIfWeb()
}
