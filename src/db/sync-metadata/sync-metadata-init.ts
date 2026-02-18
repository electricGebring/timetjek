import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'

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
