import { Capacitor } from '@capacitor/core'

import { getDb } from '../drizzle'

import { syncMetadata as syncMetadataTable } from '../schema'

import { getSyncMetadata } from './sync-metadata-query'

import type { SyncMetadata } from './sync-metadata-types'

export async function updateSyncMetadata(
  tableName: string,
  updates: Partial<Omit<SyncMetadata, 'tableName'>>
): Promise<void> {
  const existing = await getSyncMetadata(tableName)

  const values = {
    table_name: tableName,
    last_sync_timestamp: updates.lastSyncTimestamp ?? existing?.lastSyncTimestamp ?? null,
    sync_token: updates.syncToken ?? existing?.syncToken ?? null,
    last_successful_sync: updates.lastSuccessfulSync ?? existing?.lastSuccessfulSync ?? null,
    sync_state: updates.syncState ?? existing?.syncState ?? 'idle',
    error_message: updates.errorMessage ?? existing?.errorMessage ?? null
  }

  await getDb()
    .insert(syncMetadataTable)
    .values(values)
    .onConflictDoUpdate({
      target: syncMetadataTable.table_name,
      set: {
        last_sync_timestamp: values.last_sync_timestamp,
        sync_token: values.sync_token,
        last_successful_sync: values.last_successful_sync,
        sync_state: values.sync_state,
        error_message: values.error_message
      }
    })

  // Persist to localStorage after write (web only)
  if (!Capacitor.isNativePlatform()) {
    const { getDB } = await import('../index')

    const db = getDB() as { saveDatabase?: () => void }

    db.saveDatabase?.()
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
