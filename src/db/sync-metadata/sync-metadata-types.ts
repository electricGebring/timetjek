export type SyncMetadata = {
  tableName: string
  lastSyncTimestamp: number | null
  syncToken: string | null
  lastSuccessfulSync: number | null
  syncState: 'idle' | 'syncing' | 'paused' | 'error'
  errorMessage: string | null
}
