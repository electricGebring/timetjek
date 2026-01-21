/**
 * Sync metadata repository for tracking sync state and timestamps
 */

import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'

export type SyncMetadata = {
  tableName: string
  lastSyncTimestamp: number | null
  syncToken: string | null
  lastSuccessfulSync: number | null
  syncState: 'idle' | 'syncing' | 'paused' | 'error'
  errorMessage: string | null
}

/**
 * Initialize sync metadata table
 */
export async function initSyncMetadataTable() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER,
        sync_token TEXT,
        last_successful_sync INTEGER,
        sync_state TEXT DEFAULT 'idle',
        error_message TEXT
      );
    `)
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync_timestamp INTEGER,
        sync_token TEXT,
        last_successful_sync INTEGER,
        sync_state TEXT DEFAULT 'idle',
        error_message TEXT
      );
    `)
    saveDatabase()
  }
}

/**
 * Get sync metadata for a table
 */
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

/**
 * Update sync metadata
 */
export async function updateSyncMetadata(
  tableName: string,
  updates: Partial<Omit<SyncMetadata, 'tableName'>>
): Promise<void> {

  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const existing = await getSyncMetadata(tableName)

    if (existing) {
      // Update existing
      await db.run(
        `UPDATE sync_metadata 
         SET last_sync_timestamp = ?, 
             sync_token = ?, 
             last_successful_sync = ?,
             sync_state = ?,
             error_message = ?
         WHERE table_name = ?`,
        [
          updates.lastSyncTimestamp ?? existing.lastSyncTimestamp,
          updates.syncToken ?? existing.syncToken,
          updates.lastSuccessfulSync ?? existing.lastSuccessfulSync,
          updates.syncState ?? existing.syncState,
          updates.errorMessage ?? existing.errorMessage,
          tableName,
        ]
      )
    } else {
      // Insert new
      await db.run(
        `INSERT INTO sync_metadata 
         (table_name, last_sync_timestamp, sync_token, last_successful_sync, sync_state, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tableName,
          updates.lastSyncTimestamp ?? null,
          updates.syncToken ?? null,
          updates.lastSuccessfulSync ?? null,
          updates.syncState ?? 'idle',
          updates.errorMessage ?? null,
        ]
      )
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    const existing = await getSyncMetadata(tableName)

    if (existing) {
      sqlJsDb.run(
        `UPDATE sync_metadata 
         SET last_sync_timestamp = ?, 
             sync_token = ?, 
             last_successful_sync = ?,
             sync_state = ?,
             error_message = ?
         WHERE table_name = ?`,
        [
          updates.lastSyncTimestamp ?? existing.lastSyncTimestamp,
          updates.syncToken ?? existing.syncToken,
          updates.lastSuccessfulSync ?? existing.lastSuccessfulSync,
          updates.syncState ?? existing.syncState,
          updates.errorMessage ?? existing.errorMessage,
          tableName,
        ]
      )
    } else {
      sqlJsDb.run(
        `INSERT INTO sync_metadata 
         (table_name, last_sync_timestamp, sync_token, last_successful_sync, sync_state, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          tableName,
          updates.lastSyncTimestamp ?? null,
          updates.syncToken ?? null,
          updates.lastSuccessfulSync ?? null,
          updates.syncState ?? 'idle',
          updates.errorMessage ?? null,
        ]
      )
    }
    saveDatabase()
  }
}

/**
 * Mark sync as successful
 */
export async function markSyncSuccess(tableName: string, syncToken?: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await updateSyncMetadata(tableName, {
    lastSyncTimestamp: now,
    lastSuccessfulSync: now,
    syncToken: syncToken ?? null,
    syncState: 'idle',
    errorMessage: null,
  })
}

/**
 * Mark sync as failed
 */
export async function markSyncError(tableName: string, errorMessage: string): Promise<void> {
  await updateSyncMetadata(tableName, {
    syncState: 'error',
    errorMessage,
  })
}

/**
 * Set sync state
 */
export async function setSyncState(
  tableName: string,
  state: SyncMetadata['syncState']
): Promise<void> {
  await updateSyncMetadata(tableName, { syncState: state })
}
