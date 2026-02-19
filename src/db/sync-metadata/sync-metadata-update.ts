import { getDB } from '../index'

import { Capacitor } from '@capacitor/core'

import { getSyncMetadata } from './sync-metadata-query'

import type { SyncMetadata } from './sync-metadata-types'

export async function updateSyncMetadata(
  tableName: string,
  updates: Partial<Omit<SyncMetadata, 'tableName'>>
): Promise<void> {
  if (Capacitor.isNativePlatform()) {

    // Type assertion: Capacitor SQLite DB type
    const db = getDB() as {
      run: (sql: string, params?: unknown[]) => Promise<unknown>
    }

    const existing = await getSyncMetadata(tableName)

    if (existing) {
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
          tableName
        ]
      )
    }
 else {
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
          updates.errorMessage ?? null
        ]
      )
    }
  }
 else {
    const { sqlJsDb, saveDatabase } = getDB() as {
      sqlJsDb: { run: (sql: string, params?: unknown[]) => void }
      saveDatabase: () => void
    }

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
          tableName
        ]
      )
    }
 else {
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
          updates.errorMessage ?? null
        ]
      )
    }

    saveDatabase()
  }
}

export async function markSyncSuccess(tableName: string, syncToken?: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000)

  await updateSyncMetadata(tableName, {
    lastSyncTimestamp: now,
    lastSuccessfulSync: now,
    syncToken: syncToken ?? null,
    syncState: 'idle',
    errorMessage: null
  })
}

export async function markSyncError(tableName: string, errorMessage: string): Promise<void> {
  await updateSyncMetadata(tableName, {
    syncState: 'error',
    errorMessage
  })
}

export async function setSyncState(tableName: string, state: SyncMetadata['syncState']): Promise<void> {
  await updateSyncMetadata(tableName, { syncState: state })
}
