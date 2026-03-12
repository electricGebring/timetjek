import { eq } from 'drizzle-orm'

import { getDb } from '../drizzle'

import { syncMetadata as syncMetadataTable } from '../schema'

import type { SyncMetadata } from './sync-metadata-types'

export async function getSyncMetadata(tableName: string): Promise<SyncMetadata | null> {
  const rows = await getDb()
    .select()
    .from(syncMetadataTable)
    .where(eq(syncMetadataTable.table_name, tableName))

  const row = rows[0]

  if (!row) return null

  return {
    tableName: row.table_name,
    lastSyncTimestamp: row.last_sync_timestamp ?? null,
    syncToken: row.sync_token ?? null,
    lastSuccessfulSync: row.last_successful_sync ?? null,
    syncState: (row.sync_state ?? 'idle') as SyncMetadata['syncState'],
    errorMessage: row.error_message ?? null
  }
}
