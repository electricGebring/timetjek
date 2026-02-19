import { getDB } from '../index'

import { Capacitor } from '@capacitor/core'

import type { SyncMetadata } from './sync-metadata-types'

export async function getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
  if (Capacitor.isNativePlatform()) {
    // Type assertion for Capacitor SQLite DB
    const db = getDB() as {
      query: (sql: string, params?: unknown[]) => Promise<{ values?: unknown[][] }>
    }

    const res = await db.query('SELECT * FROM sync_metadata WHERE table_name = ?', [tableName])

    if (!res.values || res.values.length === 0) return null

    const row = res.values[0]

    if (!Array.isArray(row)) return null

    return {
      tableName: String(row[0]),
      lastSyncTimestamp: row[1] !== null ? Number(row[1]) : null,
      syncToken: row[2] !== null ? String(row[2]) : null,
      lastSuccessfulSync: row[3] !== null ? Number(row[3]) : null,
      syncState: (row[4] ?? 'idle') as SyncMetadata['syncState'],
      errorMessage: row[5] !== null ? String(row[5]) : null
    }
  }
 else {
    const { sqlJsDb } = getDB() as {
      sqlJsDb: { exec: (sql: string, params: unknown[]) => { length: number; values: unknown[][] }[] }
    }

    const results = sqlJsDb.exec('SELECT * FROM sync_metadata WHERE table_name = ?', [tableName])

    if (!results.length || !results[0]?.values || !results[0].values.length) return null

    const row = results[0].values[0]

    if (!Array.isArray(row)) return null

    return {
      tableName: String(row[0]),
      lastSyncTimestamp: row[1] !== null ? Number(row[1]) : null,
      syncToken: row[2] !== null ? String(row[2]) : null,
      lastSuccessfulSync: row[3] !== null ? Number(row[3]) : null,
      syncState: (row[4] ?? 'idle') as SyncMetadata['syncState'],
      errorMessage: row[5] !== null ? String(row[5]) : null
    }
  }
}
