// Permanent deletion of work_entry (used by sync-adapter)
export async function permanentDeleteWorkEntry(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('DELETE FROM work_entries WHERE id = ?', [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('DELETE FROM work_entries WHERE id = ?', [id])
    saveDatabase()
  }
}
import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'

// Get all work_entries (not deleted)
export async function getWorkEntries() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM work_entries WHERE deleted = 0')
      if (!res.values) {
        return []
      }
    return res.values.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM work_entries WHERE deleted = 0')
      if (results.length === 0) {
        return []
      }
    const [result] = results
    return result.values.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  }
}

// Get unsynced work_entries
export async function getUnsyncedWorkEntries() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM work_entries WHERE synced = 0 AND deleted = 0')
      if (!res.values) {
        return []
      }
    return res.values.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM work_entries WHERE synced = 0 AND deleted = 0')
      if (results.length === 0) {
        return []
      }
    const rows = results[0].values
    return rows.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  }
}

// Get deleted work_entries that are not yet synced
export async function getDeletedWorkEntries() {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query('SELECT * FROM work_entries WHERE deleted = 1 AND synced = 0')
      if (!res.values) {
        return []
      }
    return res.values.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec('SELECT * FROM work_entries WHERE deleted = 1 AND synced = 0')
      if (results.length === 0) {
        return []
      }
    const rows = results[0].values
    return rows.map((row: any[]) => ({
      id: row[0],
      work_day_id: row[1],
      name: row[2],
      type: row[3],
      personalNumber: row[4],
      timeIn: row[5],
      timeOut: row[6],
      break: row[7],
      workTime: row[8],
      status: row[9],
      statusType: row[10],
      hasError: row[11],
      updatedBy: row[12],
      updatedAt: row[13],
      createdAt: row[14],
      synced: row[15],
      deleted: row[16]
    }))
  }
}

// Upsert (insert/update) for work_entries
export async function upsertWorkEntry(entry: any) {
  // Set default values for all fields that can be undefined
  const safeEntry = {
    id: entry.id ?? null,
    work_day_id: entry.work_day_id ?? null,
    name: entry.name ?? '',
    type: entry.type ?? '',
    personalNumber: entry.personalNumber ?? '',
    timeIn: entry.timeIn == null ? null : entry.timeIn,
    timeOut: entry.timeOut == null ? null : entry.timeOut,
    break: entry.break == null ? null : entry.break,
    workTime: entry.workTime == null ? null : entry.workTime,
    status: entry.status == null ? null : entry.status,
    statusType: entry.statusType == null ? null : entry.statusType,
    hasError: entry.hasError ?? 0,
    updatedBy: entry.updatedBy == null ? null : entry.updatedBy,
    updatedAt: entry.updatedAt == null ? null : entry.updatedAt,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    synced: entry.synced ?? 0,
    deleted: entry.deleted ?? 0
  }
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    let rowExists = false
    if (safeEntry.id) {
      const res = await db.query('SELECT id FROM work_entries WHERE id = ?', [safeEntry.id])
      rowExists = !!(res.values && res.values.length)
    }
    if (rowExists) {
      await db.run(
        'UPDATE work_entries SET work_day_id=?, name=?, type=?, personalNumber=?, timeIn=?, timeOut=?, break=?, workTime=?, status=?, statusType=?, hasError=?, updatedBy=?, updatedAt=?, createdAt=?, synced=?, deleted=? WHERE id=?',
        [
          safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut, safeEntry.break,
          safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
          safeEntry.synced, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      await db.run(
        'INSERT INTO work_entries (id, work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          safeEntry.id, safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
          safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
          safeEntry.synced, safeEntry.deleted
        ]
      )
      // If you want to fetch id directly after insert:
      // const res = await db.query('SELECT last_insert_rowid() as id')
      // safeEntry.id = res.values?.[0]?.[0]
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    let rowExists = false
    if (safeEntry.id) {
      const results = sqlJsDb.exec('SELECT id FROM work_entries WHERE id = ?', [safeEntry.id])
      rowExists = results.length > 0 && results[0].values.length > 0
    }
    if (rowExists) {
      sqlJsDb.run(
        'UPDATE work_entries SET work_day_id=?, name=?, type=?, personalNumber=?, timeIn=?, timeOut=?, break=?, workTime=?, status=?, statusType=?, hasError=?, updatedBy=?, updatedAt=?, createdAt=?, synced=?, deleted=? WHERE id=?',
        [
          safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut, safeEntry.break,
          safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
          safeEntry.synced, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      sqlJsDb.run(
        'INSERT INTO work_entries (id, work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          safeEntry.id, safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
          safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
          safeEntry.synced, safeEntry.deleted
        ]
      )
      // If you want to fetch id directly after insert:
      // const res = sqlJsDb.exec('SELECT last_insert_rowid() as id')
      // safeEntry.id = res?.[0]?.values?.[0]?.[0]
    }
    saveDatabase()
  }
}