import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'
import type { SyncMetadata } from './sync-metadata-types'

export async function getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM sync_metadata WHERE table_name = ?', [tableName])
    if (!res.values || res.values.length === 0) return null
    const row = res.values[0]
    return {
      tableName: row[0],
      lastSyncTimestamp: row[1] ?? null,
      syncToken: row[2] ?? null,
      lastSuccessfulSync: row[3] ?? null,
      syncState: (row[4] ?? 'idle') as SyncMetadata['syncState'],
      errorMessage: row[5] ?? null,
    }
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM sync_metadata WHERE table_name = ?', [tableName])
    if (results.length === 0 || results[0].values.length === 0) return null
    const row = results[0].values[0]
    return {
      tableName: row[0],
      lastSyncTimestamp: row[1] ?? null,
      syncToken: row[2] ?? null,
      lastSuccessfulSync: row[3] ?? null,
      syncState: (row[4] ?? 'idle') as SyncMetadata['syncState'],
      errorMessage: row[5] ?? null,
    }
  }
}
