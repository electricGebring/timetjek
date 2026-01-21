import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import initSqlJs, { type Database } from 'sql.js'

let sqlite: SQLiteConnection | null = null
let capacitorDb: any = null
let sqlJsDb: Database | null = null

/**
 * Initializes the database for the application.
 * Uses Capacitor SQLite for native platforms (iOS/Android)
 * and sql.js for web. Creates the todos table if it doesn't exist.
 */
export async function initDB() {
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor SQLite for native platforms

    if (!sqlite) {
      sqlite = new SQLiteConnection(CapacitorSQLite)
    }

    capacitorDb = await sqlite.createConnection('appdb', false, 'no-encryption', 1, false)

    await capacitorDb.open()

    await capacitorDb.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `)

    // Migration: Add deleted column if it doesn't exist
    try {
      await capacitorDb.execute(`
        ALTER TABLE todos ADD COLUMN deleted INTEGER DEFAULT 0;
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Migration: Add updatedAt column if it doesn't exist
    try {
      await capacitorDb.execute(`
        ALTER TABLE todos ADD COLUMN updatedAt INTEGER DEFAULT (strftime('%s', 'now'));
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Migration: Add createdAt column if it doesn't exist
    try {
      await capacitorDb.execute(`
        ALTER TABLE todos ADD COLUMN createdAt INTEGER DEFAULT (strftime('%s', 'now'));
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Initialize sync metadata table
    const { initSyncMetadataTable } = await import('./sync-metadata/repo')
    await initSyncMetadataTable()

    // Create indexes for performance
    await capacitorDb.execute(`
      CREATE INDEX IF NOT EXISTS idx_todos_synced ON todos(synced);
      CREATE INDEX IF NOT EXISTS idx_todos_deleted ON todos(deleted);
      CREATE INDEX IF NOT EXISTS idx_todos_updatedAt ON todos(updatedAt);
      CREATE INDEX IF NOT EXISTS idx_todos_createdAt ON todos(createdAt);
      CREATE INDEX IF NOT EXISTS idx_todos_synced_deleted ON todos(synced, deleted);
    `)
  } else {
    // Use sql.js for web
    // Try to load WASM from public folder first (works offline)
    // Falls back to CDN if public file doesn't exist
    let SQL: any
    try {
      SQL = await initSqlJs({
        locateFile: (file) => {
          // First try public folder (works offline)
          if (file.endsWith('.wasm')) {
            return '/sqljs/sql-wasm.wasm'
          }
          return `https://sql.js.org/dist/${file}`
        }
      })
    } catch (error: any) {
      // If public file doesn't exist, try CDN
      if (error.message?.includes('fetch') || error.message?.includes('WASM') || error.message?.includes('404')) {
        console.warn('[DB] Public WASM not found, trying CDN...')
        try {
          SQL = await initSqlJs({
            locateFile: (file) => `https://sql.js.org/dist/${file}`
          })
        } catch (cdnError) {
          // If both fail, throw with helpful message
          throw new Error(
            'Failed to load sql.js WASM file. ' +
            'For offline support, copy node_modules/sql.js/dist/sql-wasm.wasm to public/sqljs/sql-wasm.wasm'
          )
        }
      } else {
        throw error
      }
    }

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('sqljs_db')
    if (savedDb) {
      const buf = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
      sqlJsDb = new SQL.Database(buf)
    } else {
      sqlJsDb = new SQL.Database()
    }

    if (!sqlJsDb) {
      throw new Error('Failed to initialize sql.js database')
    }

    // TypeScript: sqlJsDb is now guaranteed to be non-null
    const db = sqlJsDb

    // Create table
    db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        updatedAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
      );
    `)

    // Migration: Add deleted column if it doesn't exist
    try {
      db.run(`
        ALTER TABLE todos ADD COLUMN deleted INTEGER DEFAULT 0;
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Migration: Add updatedAt column if it doesn't exist
    try {
      db.run(`
        ALTER TABLE todos ADD COLUMN updatedAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER));
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Migration: Add createdAt column if it doesn't exist
    try {
      db.run(`
        ALTER TABLE todos ADD COLUMN createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER));
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

    // Initialize sync metadata table
    const { initSyncMetadataTable } = await import('./sync-metadata/repo')
    await initSyncMetadataTable()

    // Create indexes for performance
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_todos_synced ON todos(synced);
      CREATE INDEX IF NOT EXISTS idx_todos_deleted ON todos(deleted);
      CREATE INDEX IF NOT EXISTS idx_todos_updatedAt ON todos(updatedAt);
      CREATE INDEX IF NOT EXISTS idx_todos_createdAt ON todos(createdAt);
      CREATE INDEX IF NOT EXISTS idx_todos_synced_deleted ON todos(synced, deleted);
    `)

    // Save to localStorage
    saveDatabase()
  }
}

/**
 * Saves the sql.js database to localStorage.
 * Exports the database as Uint8Array and converts to base64.
 * Only used for the web platform.
 */
function saveDatabase() {
  if (sqlJsDb) {
    const data = sqlJsDb.export()
    // Convert Uint8Array to base64 for browser
    const binary = Array.from(data)
      .map((byte) => String.fromCharCode(byte))
      .join('')
    localStorage.setItem('sqljs_db', btoa(binary))
  }
}

/**
 * Returns the active database instance.
 * For native platforms returns the Capacitor SQLite connection.
 * For web returns the sql.js database along with the saveDatabase function.
 */
export function getDB() {
  if (Capacitor.isNativePlatform()) {
    if (!capacitorDb) {
      throw new Error('Capacitor DB not initialized')
    }
    return capacitorDb
  } else {
    if (!sqlJsDb) {
      throw new Error('sql.js DB not initialized')
    }
    return { sqlJsDb, saveDatabase }
  }
}

/**
 * Exposes database query helper to window for Chrome DevTools debugging.
 * Only available in development/web platform.
 * 
 * Usage in Chrome Console:
 *   window.dbQuery('SELECT * FROM todos')
 *   window.dbQuery('SELECT * FROM sync_metadata')
 *   window.dbQuery('SELECT COUNT(*) as count FROM todos WHERE synced = 0')
 */
if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
  (window as any).dbQuery = (sql: string) => {
    if (!sqlJsDb) {
      console.error('Database not initialized. Make sure the app has loaded.')
      return null
    }
    try {
      const result = sqlJsDb.exec(sql)
      if (result.length === 0) {
        console.log('Query executed successfully (no results)')
        return []
      }
      const [queryResult] = result
      if (!queryResult) {
        console.log('Query executed successfully (no results)')
        return []
      }
      const columns = queryResult.columns
      const rows = queryResult.values.map((row: any[]) => {
        const obj: any = {}
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i]
        })
        return obj
      })
      console.table(rows)
      return rows
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }
  
  console.log('%c💾 Database Query Helper Available!', 'color: #4CAF50; font-weight: bold; font-size: 14px')
  console.log('Use window.dbQuery("SELECT * FROM todos") in the console to query the database')
}
