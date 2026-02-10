import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'
import type { WorkEntry } from './types'
import type { Entry } from '@/views/staffRegister/types'
import type { TimeRegistrationApplication } from '@/enums/TimeRegistrationApplication'
import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'
import { WORK_ENTRY_COLUMNS, parseWorkEntryRow } from './work-entry.schema'

/** Build a raw record from a row array (same order as WORK_ENTRY_COLUMNS) */
function rowToRecord(row: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {}
  WORK_ENTRY_COLUMNS.forEach((col, i) => {
    record[col] = row[i]
  })
  return record
}

/** Maps a raw row (array or object) to a WorkEntry using Zod schema (validation + coercion) */
function mapRowToWorkEntry(row: unknown): WorkEntry {
  if (Array.isArray(row)) {
    return parseWorkEntryRow(rowToRecord(row))
  }
  if (row && typeof row === 'object') {
    return parseWorkEntryRow(row as Record<string, unknown>)
  }
  return parseWorkEntryRow({})
}

// Central query function for work_entries
async function queryWorkEntries(where: string, params: any[] = []): Promise<WorkEntry[]> {
  const columns = WORK_ENTRY_COLUMNS.join(', ')
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
  return queryWorkEntries('WHERE deleted = 0 AND deleted_at IS NULL')
}

// Get unsynced work_entries
export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  return queryWorkEntries('WHERE synced = 0 AND deleted = 0 AND deleted_at IS NULL')
}

// Get deleted work_entries that are not yet synced
export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  return queryWorkEntries('WHERE deleted = 1 AND synced = 0')
}


// Soft delete work entry
export async function softDeleteWorkEntry(id: number) {
  const now = new Date().toISOString()
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run(
      'UPDATE work_entries SET deleted_at = ?, synced = 0 WHERE id = ?',
      [now, id]
    )
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(
      'UPDATE work_entries SET deleted_at = ?, synced = 0 WHERE id = ?',
      [now, id]
    )
    saveDatabase()
  }
}

// Restore soft-deleted work entry
export async function restoreWorkEntry(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run(
      'UPDATE work_entries SET deleted_at = NULL, synced = 0 WHERE id = ?',
      [id]
    )
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(
      'UPDATE work_entries SET deleted_at = NULL, synced = 0 WHERE id = ?',
      [id]
    )
    saveDatabase()
  }
}

// Calculate total working seconds from check-in/check-out and break
export function calculateTotalWorkingSeconds(
  checkInAt: string,
  checkOutAt: string | null,
  breakStr: string | null
): number | null {
  if (!checkOutAt) return null
  
  // If this is a break entry, calculate duration from break string only
  if (breakStr) {
    const parts = breakStr.split('-')
    if (parts.length === 2 && parts[0] && parts[1] && parts[1] !== '00:00:00') {
      const startParts = parts[0].split(':')
      const endParts = parts[1].split(':')
      
      const startH = parseInt(startParts[0] || '0', 10)
      const startM = parseInt(startParts[1] || '0', 10)
      const startS = parseInt(startParts[2] || '0', 10)
      const endH = parseInt(endParts[0] || '0', 10)
      const endM = parseInt(endParts[1] || '0', 10)
      const endS = parseInt(endParts[2] || '0', 10)
      
      const breakSeconds = (endH - startH) * 3600 + (endM - startM) * 60 + (endS - startS)
      const result = Math.max(0, breakSeconds)
      return result
    }
    return null
  }
  
  // For non-break entries, calculate from check-in/check-out times
  const checkIn = new Date(checkInAt).getTime()
  const checkOut = new Date(checkOutAt).getTime()
  let totalSeconds = Math.floor((checkOut - checkIn) / 1000)
  return Math.max(0, totalSeconds)
}

// Mark a work entry as synced (used by sync engine only)
export async function markWorkEntryAsSynced(id: number) {
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    await db.run('UPDATE work_entries SET synced = 1 WHERE id = ?', [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run('UPDATE work_entries SET synced = 1 WHERE id = ?', [id])
    saveDatabase()
  }
}

// Upsert (insert/update) for work_entries
export async function upsertWorkEntry(entry: any) {
  const safeEntry = {
    id: entry.id ?? null,
    employee_id: entry.employee_id ?? 1,
    workplace_id: entry.workplace_id ?? 1,
    cost_center_id: entry.cost_center_id ?? null,
    work_day_id: entry.work_day_id ?? null,
    status: entry.status ?? TimeRegistrationStatus.OPEN,
    check_in_at: entry.check_in_at ?? new Date().toISOString(),
    check_in_time_at: entry.check_in_time_at ?? null,
    check_in_latitude: entry.check_in_latitude ?? null,
    check_in_longitude: entry.check_in_longitude ?? null,
    check_in_application: entry.check_in_application ?? 'APP',
    check_out_at: entry.check_out_at ?? null,
    check_out_time_at: entry.check_out_time_at ?? null,
    check_out_latitude: entry.check_out_latitude ?? null,
    check_out_longitude: entry.check_out_longitude ?? null,
    check_out_application: entry.check_out_application ?? null,
    break: entry.break ?? null,
    meal_benefit_has_breakfast: entry.meal_benefit_has_breakfast ? 1 : 0,
    meal_benefit_has_lunch: entry.meal_benefit_has_lunch ? 1 : 0,
    name: entry.name ?? '',
    type: entry.type ?? '',
    personalNumber: entry.personalNumber ?? '',
    administrator_comment: entry.administrator_comment ?? null,
    total_working_seconds: entry.total_working_seconds ?? null,
    total_break_seconds: entry.total_break_seconds ?? null,
    hasError: entry.hasError ?? 0,
    updatedBy: entry.updatedBy ?? null,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
    deleted_at: entry.deleted_at ?? null,
    synced: entry.synced ?? 0,
    deleted: entry.deleted ?? 0
  }
  console.log('[4a. REPO] 💾 Upserting to SQLite, id:', safeEntry.id, 'synced:', safeEntry.synced ?? 0)
  
  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    let rowExists = false
    if (safeEntry.id) {
      const res = await db.query('SELECT id FROM work_entries WHERE id = ?', [safeEntry.id])
      rowExists = !!(res.values && res.values.length)
    }
    if (rowExists) {
      await db.run(
        'UPDATE work_entries SET employee_id=?, workplace_id=?, cost_center_id=?, work_day_id=?, status=?, check_in_at=?, check_in_time_at=?, check_in_latitude=?, check_in_longitude=?, check_in_application=?, check_out_at=?, check_out_time_at=?, check_out_latitude=?, check_out_longitude=?, check_out_application=?, break=?, meal_benefit_has_breakfast=?, meal_benefit_has_lunch=?, name=?, type=?, personalNumber=?, administrator_comment=?, total_working_seconds=?, total_break_seconds=?, hasError=?, updatedBy=?, createdAt=?, updatedAt=?, deleted_at=?, synced=?, deleted=? WHERE id=?',
        [
          safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
          safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
          safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
          safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
          safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
          safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, 0, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      if (safeEntry.id) {
        await db.run(
          'INSERT INTO work_entries (id, employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.id, safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
            safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
            safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
            safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
            safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
            safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, safeEntry.synced, safeEntry.deleted
          ]
        )
      } else {
        await db.run(
          'INSERT INTO work_entries (employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
            safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
            safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
            safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
            safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
            safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, safeEntry.synced, safeEntry.deleted
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
        'UPDATE work_entries SET employee_id=?, workplace_id=?, cost_center_id=?, work_day_id=?, status=?, check_in_at=?, check_in_time_at=?, check_in_latitude=?, check_in_longitude=?, check_in_application=?, check_out_at=?, check_out_time_at=?, check_out_latitude=?, check_out_longitude=?, check_out_application=?, break=?, meal_benefit_has_breakfast=?, meal_benefit_has_lunch=?, name=?, type=?, personalNumber=?, administrator_comment=?, total_working_seconds=?, total_break_seconds=?, hasError=?, updatedBy=?, createdAt=?, updatedAt=?, deleted_at=?, synced=?, deleted=? WHERE id=?',
        [
          safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
          safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
          safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
          safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
          safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
          safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, 0, safeEntry.deleted, safeEntry.id
        ]
      )
    } else {
      if (safeEntry.id) {
        sqlJsDb.run(
          'INSERT INTO work_entries (id, employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.id, safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
            safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
            safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
            safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
            safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
            safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, safeEntry.synced, safeEntry.deleted
          ]
        )
      } else {
        sqlJsDb.run(
          'INSERT INTO work_entries (employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            safeEntry.employee_id, safeEntry.workplace_id, safeEntry.cost_center_id, safeEntry.work_day_id, safeEntry.status,
            safeEntry.check_in_at, safeEntry.check_in_time_at, safeEntry.check_in_latitude, safeEntry.check_in_longitude, safeEntry.check_in_application,
            safeEntry.check_out_at, safeEntry.check_out_time_at, safeEntry.check_out_latitude, safeEntry.check_out_longitude, safeEntry.check_out_application,
            safeEntry.break, safeEntry.meal_benefit_has_breakfast, safeEntry.meal_benefit_has_lunch,
            safeEntry.name, safeEntry.type, safeEntry.personalNumber, safeEntry.administrator_comment, safeEntry.total_working_seconds, safeEntry.total_break_seconds,
            safeEntry.hasError, safeEntry.updatedBy, safeEntry.createdAt, safeEntry.updatedAt, safeEntry.deleted_at, safeEntry.synced, safeEntry.deleted
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
    employee_id: w.employee_id ?? 1,
    workplace_id: w.workplace_id ?? 1,
    cost_center_id: w.cost_center_id ?? null,
    work_day_id: w.work_day_id ?? 0,
    status: (w.status ?? TimeRegistrationStatus.OPEN) as TimeRegistrationStatus,
    check_in_at: w.check_in_at ?? '',
    check_in_time_at: w.check_in_time_at ?? '',
    check_in_latitude: w.check_in_latitude ?? 0,
    check_in_longitude: w.check_in_longitude ?? 0,
    check_in_application: (w.check_in_application ?? 'APP') as TimeRegistrationApplication,
    check_out_at: w.check_out_at ?? null,
    check_out_time_at: w.check_out_time_at ?? null,
    check_out_latitude: w.check_out_latitude ?? null,
    check_out_longitude: w.check_out_longitude ?? null,
    check_out_application: w.check_out_application as TimeRegistrationApplication | null,
    break: w.break ?? null,
    meal_benefit_has_breakfast: w.meal_benefit_has_breakfast ?? false,
    meal_benefit_has_lunch: w.meal_benefit_has_lunch ?? false,
    name: w.name ?? '',
    type: w.type ?? '',
    personalNumber: w.personalNumber ?? '',
    administrator_comment: w.administrator_comment ?? null,
    total_working_seconds: w.total_working_seconds ?? null,
    createdAt: w.createdAt ?? new Date().toISOString(),
    updatedAt: w.updatedAt ?? new Date().toISOString(),
    deleted_at: w.deleted_at ?? null,
    synced: w.synced ?? 0,
    deleted: w.deleted ?? 0
  }
}