import { getDB } from '../index'

import { Capacitor } from '@capacitor/core'

const SYNC_METADATA_DDL = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    table_name TEXT PRIMARY KEY,
    last_sync_timestamp INTEGER,
    sync_token TEXT,
    last_successful_sync INTEGER,
    sync_state TEXT DEFAULT 'idle',
    error_message TEXT
  );
`

async function initSyncMetadataTableNative(): Promise<void> {
  // Type assertion for Capacitor SQLite DB
  const db = getDB() as {
    execute: (options: { statements: string }) => Promise<unknown>
  }

  await db.execute({ statements: SYNC_METADATA_DDL })
}

function initSyncMetadataTableWeb(): void {
  const { sqlJsDb, saveDatabase } = getDB() as { sqlJsDb: { run: (sql: string) => void }; saveDatabase: () => void }

  sqlJsDb.run(SYNC_METADATA_DDL)

  saveDatabase()
}

export async function initSyncMetadataTable(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await initSyncMetadataTableNative()
  }
 else {
    initSyncMetadataTableWeb()
  }
}
