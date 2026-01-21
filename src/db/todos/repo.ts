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
    if (!res.values) return []
    return res.values.map((row: [number, string, number, number, number, number | undefined, number | undefined]) => ({
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
    }))
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
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
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
  const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('INSERT INTO todos (title, done, synced, deleted, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [title, 0, 0, 0, now, now])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('INSERT INTO todos (title, done, synced, deleted, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [title, 0, 0, 0, now, now])
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
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
    }))
  }
}

/**
 * Gets a single todo by ID
 */
export async function getTodoById(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM todos WHERE id = ?', [id])
    if (!res.values || res.values.length === 0) return null
    const row = res.values[0]
    return {
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
    }
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM todos WHERE id = ?', [id])
    if (results.length === 0 || results[0].values.length === 0) return null
    const row = results[0].values[0]
    return {
      id: row[0],
      title: row[1],
      done: row[2],
      synced: row[3],
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
    }
  }
}

/**
 * Marks a todo as synced
 */
export async function markAsSynced(id: number) {
  const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('UPDATE todos SET synced = 1, updatedAt = ? WHERE id = ?', [now, id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('UPDATE todos SET synced = 1, updatedAt = ? WHERE id = ?', [now, id])
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
      deleted: row[4],
      updatedAt: row[5] ?? Date.now(),
      createdAt: row[6] ?? row[5] ?? Date.now() // Fallback to updatedAt if createdAt missing
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
  const updatedAt = todo.updatedAt ? Math.floor(todo.updatedAt / 1000) : Math.floor(Date.now() / 1000)
  const createdAt = todo.createdAt ? Math.floor(todo.createdAt / 1000) : updatedAt // Use updatedAt as fallback
  const synced = todo.synced !== undefined ? todo.synced : 1

  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    // Check if exists
    const existing = await db.query('SELECT * FROM todos WHERE id = ?', [todo.id])
    if (existing.values && existing.values.length > 0) {
      // Update existing - respect synced flag if provided, otherwise update if already synced
      // Don't update createdAt on existing records
      if (todo.synced !== undefined) {
        await db.run('UPDATE todos SET title = ?, done = ?, synced = ?, updatedAt = ? WHERE id = ?', [
          todo.title,
          todo.done,
          synced,
          updatedAt,
          todo.id
        ])
      } else {
        // Only update if already synced (preserve local unsynced changes)
        await db.run('UPDATE todos SET title = ?, done = ?, updatedAt = ? WHERE id = ? AND synced = 1', [
          todo.title,
          todo.done,
          updatedAt,
          todo.id
        ])
      }
    } else {
      // Insert new with explicit ID
      await db.run('INSERT INTO todos (id, title, done, synced, deleted, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        todo.id,
        todo.title,
        todo.done,
        synced,
        0,
        updatedAt,
        createdAt
      ])
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    // Check if exists
    const existing = sqlJsDb.exec('SELECT * FROM todos WHERE id = ?', [todo.id])
    if (existing.length > 0 && existing[0].values.length > 0) {
      // Update existing - respect synced flag if provided
      // Don't update createdAt on existing records
      if (todo.synced !== undefined) {
        sqlJsDb.run('UPDATE todos SET title = ?, done = ?, synced = ?, updatedAt = ? WHERE id = ?', [
          todo.title,
          todo.done,
          synced,
          updatedAt,
          todo.id
        ])
      } else {
        // Only update if already synced (preserve local unsynced changes)
        sqlJsDb.run('UPDATE todos SET title = ?, done = ?, updatedAt = ? WHERE id = ? AND synced = 1', [
          todo.title,
          todo.done,
          updatedAt,
          todo.id
        ])
      }
    } else {
      // Insert new with explicit ID
      sqlJsDb.run('INSERT INTO todos (id, title, done, synced, deleted, updatedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        todo.id,
        todo.title,
        todo.done,
        synced,
        0,
        updatedAt,
        createdAt
      ])
    }
    saveDatabase()
  }
}
