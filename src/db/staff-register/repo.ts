import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'
import type { WorkEntry } from './types'
import type { Entry } from '@/views/staffRegister/types'

// Column names in correct order for work_entries
const workEntryColumns = [
  'id',
  'work_day_id',
  'name',
  'type',
  'personalNumber',
  'timeIn',
  'timeOut',
  'break',
  'workTime',
  'status',
  'statusType',
  'hasError',
  'updatedBy',
  'updatedAt',
  'createdAt',
  'synced',
  'deleted'
]

// Maps a row array to a WorkEntry object
function mapRowToWorkEntry(row: any[]): WorkEntry {
  return {
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
  }
}

// Central query function for work_entries
async function queryWorkEntries(where: string, params: any[] = []): Promise<WorkEntry[]> {
  const columns = workEntryColumns.join(', ')
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    const res = await db.query(`SELECT ${columns} FROM work_entries ${where}`.trim(), params)
    if (!res.values) return []
    return res.values.map(mapRowToWorkEntry)
  } else {
    const { sqlJsDb } = getDB() as any
    const results = sqlJsDb.exec(`SELECT ${columns} FROM work_entries ${where}`.trim(), params)
    if (results.length === 0) return []
    return results[0].values.map(mapRowToWorkEntry)
  }
}

// Get all work_entries (not deleted)
export async function getWorkEntries(): Promise<WorkEntry[]> {
  return queryWorkEntries('WHERE deleted = 0')
}

// Get unsynced work_entries
export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  return queryWorkEntries('WHERE synced = 0 AND deleted = 0')
}

// Get deleted work_entries that are not yet synced
export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  return queryWorkEntries('WHERE deleted = 1 AND synced = 0')
}

// Upsert (insert/update) for work_entries
export async function upsertWorkEntry(entry: any) {
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
          0, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      if (safeEntry.id) {
        await db.run(
          'INSERT INTO work_entries (id, work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.id, safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
            safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
            safeEntry.synced, safeEntry.deleted
          ]
        )
      } else {
        await db.run(
          'INSERT INTO work_entries (work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
            safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
            safeEntry.synced, safeEntry.deleted
          ]
        )
      }
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
         0, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      if (safeEntry.id) {
        sqlJsDb.run(
          'INSERT INTO work_entries (id, work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.id, safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
            safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
            safeEntry.synced, safeEntry.deleted
          ]
        )
      } else {

        sqlJsDb.run(
          'INSERT INTO work_entries (work_day_id, name, type, personalNumber, timeIn, timeOut, break, workTime, status, statusType, hasError, updatedBy, updatedAt, createdAt, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.work_day_id, safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.timeIn, safeEntry.timeOut,
            safeEntry.break, safeEntry.workTime, safeEntry.status, safeEntry.statusType, safeEntry.hasError, safeEntry.updatedBy, safeEntry.updatedAt, safeEntry.createdAt,
            safeEntry.synced, safeEntry.deleted
          ]
        )
      }
    }
    saveDatabase()
  }
}

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

export function workEntryToEntry(w: WorkEntry): Entry {
  return {
    id: w.id ?? 0,
    name: w.name != null ? String(w.name) : '',
    type: w.type != null ? String(w.type) : '',
    personalNumber: w.personalNumber != null ? String(w.personalNumber) : '',
    timeIn: w.timeIn != null ? String(w.timeIn) : '',
    timeOut: w.timeOut != null ? String(w.timeOut) : null,
    break: w.break != null ? String(w.break) : null,
    workTime: w.workTime != null ? String(w.workTime) : null,
    status: w.status != null ? String(w.status) : null,
    statusType: w.statusType != null ? String(w.statusType) : '',
    hasError: !!w.hasError,
    updatedBy: w.updatedBy != null ? String(w.updatedBy) : undefined,
    updatedAt: w.updatedAt != null ? String(w.updatedAt) : undefined,
    work_day_id: w.work_day_id ?? undefined,
  }
}