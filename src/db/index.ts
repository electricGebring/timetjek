import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import initSqlJs, { type Database } from 'sql.js'
//
let sqlite: SQLiteConnection | null = null
let capacitorDb: any = null
let sqlJsDb: Database | null = null

/**
 * Initializes the database for the application.
 * Uses Capacitor SQLite for native platforms (iOS/Android)
 * and sql.js for web. Creates the todos table if it doesn't exist.
 */
export async function initDB() {
  const { initTodosDb } = await import('./todos/init')
  const { initStaffRegisterDb } = await import('./staff-register/init')
  if (Capacitor.isNativePlatform()) {
    if (!sqlite) {
      sqlite = new SQLiteConnection(CapacitorSQLite)
    }
    capacitorDb = await sqlite.createConnection('appdb', false, 'no-encryption', 1, false)
    await capacitorDb.open()
    await initTodosDb(capacitorDb, true)
    await initStaffRegisterDb(capacitorDb, true)
    const { initSyncMetadataTable } = await import('./sync-metadata/repo')
    await initSyncMetadataTable()
  } else {
    let SQL: any
    try {
      SQL = await initSqlJs({
        locateFile: (file) => {
          if (file.endsWith('.wasm')) {
            return '/sqljs/sql-wasm.wasm'
          }
          return `https://sql.js.org/dist/${file}`
        }
      })
    } catch (error: any) {
      if (error.message?.includes('fetch') || error.message?.includes('WASM') || error.message?.includes('404')) {
        console.warn('[DB] Public WASM not found, trying CDN...')
        try {
          SQL = await initSqlJs({
            locateFile: (file) => `https://sql.js.org/dist/${file}`
          })
        } catch (cdnError) {
          throw new Error(
            'Failed to load sql.js WASM file. ' +
            'For offline support, copy node_modules/sql.js/dist/sql-wasm.wasm to public/sqljs/sql-wasm.wasm'
          )
        }
      } else {
        throw error
      }
    }
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
    const db = sqlJsDb
    await initTodosDb(db, false)
    await initStaffRegisterDb(db, false)
    const { initSyncMetadataTable } = await import('./sync-metadata/repo')
    await initSyncMetadataTable()
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
        return []
      }
      const [queryResult] = result
      if (!queryResult) {
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
}
