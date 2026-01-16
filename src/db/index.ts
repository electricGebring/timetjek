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
        deleted INTEGER DEFAULT 0
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
  } else {
    // Use sql.js for web

    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    })

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('sqljs_db')
    if (savedDb) {
      const buf = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0))
      sqlJsDb = new SQL.Database(buf)
    } else {
      sqlJsDb = new SQL.Database()
    }

    // Create table
    sqlJsDb.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        done INTEGER DEFAULT 0,
        synced INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0
      );
    `)

    // Migration: Add deleted column if it doesn't exist
    try {
      sqlJsDb.run(`
        ALTER TABLE todos ADD COLUMN deleted INTEGER DEFAULT 0;
      `)
    } catch (e) {
      // Column already exists, ignore error
    }

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
