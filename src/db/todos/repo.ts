import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'

/**
 * Fetches all todos from the database.
 * Handles both native (Capacitor SQLite) and web (sql.js) platforms.
 * @returns Array of todo objects containing id, title and done
 */
export async function getTodos() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM todos WHERE deleted = 0')
    return res.values ?? []
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM todos WHERE deleted = 0')
    if (results.length === 0) return []
    
    const [result] = results
    return result.values.map((row: any[]) => ({
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4]
    }))
  }
}

/**
 * Adds a new todo to the database.
 * Creates a new todo with the specified title and done = 0 (not completed).
 * Automatically saves to localStorage for the web platform.
 * @param title - The title of the new todo
 */
export async function addTodo(title: string) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run(
      'INSERT INTO todos (title, done, synced, deleted) VALUES (?, ?, ?, ?)',
      [title, 0, 0, 0]
    )
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(
      'INSERT INTO todos (title, done, synced, deleted) VALUES (?, ?, ?, ?)',
      [title, 0, 0, 0]
    )
    saveDatabase()
  }
}

/**
 * Gets unsynced todos (synced = 0)
 */
export async function getUnsyncedTodos() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM todos WHERE synced = 0 AND deleted = 0')
    return res.values ?? []
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM todos WHERE synced = 0 AND deleted = 0')
    if (results.length === 0) return []
    
    const [result] = results
    return result.values.map((row: any[]) => ({
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4]
    }))
  }
}

/**
 * Marks a todo as synced
 */
export async function markAsSynced(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('UPDATE todos SET synced = 1 WHERE id = ?', [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('UPDATE todos SET synced = 1 WHERE id = ?', [id])
    saveDatabase()
  }
}

/**
 * Soft deletes a todo (marks as deleted and unsynced)
 */
export async function deleteTodo(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('UPDATE todos SET deleted = 1, synced = 0 WHERE id = ?', [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('UPDATE todos SET deleted = 1, synced = 0 WHERE id = ?', [id])
    saveDatabase()
  }
}

/**
 * Gets deleted but not yet synced todos
 */
export async function getDeletedTodos() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM todos WHERE deleted = 1 AND synced = 0')
    return res.values ?? []
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM todos WHERE deleted = 1 AND synced = 0')
    if (results.length === 0) return []
    
    const [result] = results
    return result.values.map((row: any[]) => ({
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4]
    }))
  }
}

/**
 * Permanently deletes a todo from the database after API sync
 */
export async function permanentDelete(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('DELETE FROM todos WHERE id = ?', [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('DELETE FROM todos WHERE id = ?', [id])
    saveDatabase()
  }
}

/**
 * Upserts a todo from API (insert or update if exists)
 */
export async function upsertTodo(todo: any) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    // Check if exists
    const existing = await db.query('SELECT * FROM todos WHERE id = ?', [todo.id])
    if (existing.values && existing.values.length > 0) {
      // Update existing (but keep synced status if unsynced)
      await db.run(
        'UPDATE todos SET title = ?, done = ? WHERE id = ? AND synced = 1',
        [todo.title, todo.done, todo.id]
      )
    } else {
      // Insert new with explicit ID
      await db.run(
        'INSERT INTO todos (id, title, done, synced, deleted) VALUES (?, ?, ?, ?, ?)',
        [todo.id, todo.title, todo.done, 1, 0]
      )
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    // Check if exists
    const existing = sqlJsDb.exec('SELECT * FROM todos WHERE id = ?', [todo.id])
    if (existing.length > 0 && existing[0].values.length > 0) {
      // Update existing (but only if synced)
      sqlJsDb.run(
        'UPDATE todos SET title = ?, done = ? WHERE id = ? AND synced = 1',
        [todo.title, todo.done, todo.id]
      )
    } else {
      // Insert new with explicit ID
      sqlJsDb.run(
        'INSERT INTO todos (id, title, done, synced, deleted) VALUES (?, ?, ?, ?, ?)',
        [todo.id, todo.title, todo.done, 1, 0]
      )
    }
    saveDatabase()
  }
}
