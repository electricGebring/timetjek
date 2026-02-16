/**
 * Staff register repository: all SQL and DB access for work_entries.
 * Uses TABLE_WORK_ENTRIES for table name; mapping and helpers are in separate layers.
 */

import { TABLE_WORK_ENTRIES } from '@/constants/tables'
import { getDB } from '../index'
import { Capacitor } from '@capacitor/core'
import type { WorkEntry } from '@/models/work-entry.schema'
import { WORK_ENTRY_COLUMNS } from '@/models/work-entry.schema'
import { mapRowToWorkEntry } from './work-entry.mapper'
import { buildSafeWorkEntry } from './work-entry.helpers'

// ─── SQL (single place, parameterized) ─────────────────────────────────────
const T = TABLE_WORK_ENTRIES
const COLS = WORK_ENTRY_COLUMNS.join(', ')

const SQL = {
  SELECT_WHERE: `SELECT ${COLS} FROM ${T}`,
  SELECT_ID: `SELECT id FROM ${T} WHERE id = ?`,
  UPDATE_SOFT_DELETE: `UPDATE ${T} SET deleted_at = ?, synced = 0 WHERE id = ?`,
  UPDATE_RESTORE: `UPDATE ${T} SET deleted_at = NULL, synced = 0 WHERE id = ?`,
  UPDATE_SYNCED: `UPDATE ${T} SET synced = 1 WHERE id = ?`,
  UPDATE_FULL: `UPDATE ${T} SET employee_id=?, workplace_id=?, cost_center_id=?, work_day_id=?, status=?, check_in_at=?, check_in_time_at=?, check_in_latitude=?, check_in_longitude=?, check_in_application=?, check_out_at=?, check_out_time_at=?, check_out_latitude=?, check_out_longitude=?, check_out_application=?, break=?, meal_benefit_has_breakfast=?, meal_benefit_has_lunch=?, name=?, type=?, personalNumber=?, administrator_comment=?, total_working_seconds=?, total_break_seconds=?, hasError=?, updatedBy=?, createdAt=?, updatedAt=?, deleted_at=?, synced=?, deleted=? WHERE id=?`,
  INSERT_WITH_ID: `INSERT INTO ${T} (id, employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  INSERT_AUTO_ID: `INSERT INTO ${T} (employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  DELETE_BY_ID: `DELETE FROM ${T} WHERE id = ?`
} as const

// ─── Query helper (run SELECT; map rows via mapper) ─────────────────────────
async function queryWorkEntries(where: string, params: unknown[] = []): Promise<WorkEntry[]> {
  const sql = `${SQL.SELECT_WHERE} ${where}`.trim()
  if (Capacitor.isNativePlatform()) {
    const res = await getDB().query(sql, params as any[])
    if (!res.values) return []
    return res.values.map(mapRowToWorkEntry)
  }
  const { sqlJsDb } = getDB() as any
  const results = sqlJsDb.exec(sql, params)
  if (results.length === 0) return []
  return results[0].values.map(mapRowToWorkEntry)
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function getWorkEntries() {
  return queryWorkEntries('WHERE deleted = 0 AND deleted_at IS NULL')
}

export async function getUnsyncedWorkEntries() {
  return queryWorkEntries('WHERE synced = 0 AND deleted = 0 AND deleted_at IS NULL')
}

export async function getDeletedWorkEntries() {
  return queryWorkEntries('WHERE deleted = 1 AND synced = 0')
}

export async function softDeleteWorkEntry(id: number) {
  const now = new Date().toISOString()
  if (Capacitor.isNativePlatform()) {
    await getDB().run(SQL.UPDATE_SOFT_DELETE, [now, id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(SQL.UPDATE_SOFT_DELETE, [now, id])
    saveDatabase()
  }
}

export async function restoreWorkEntry(id: number) {
  if (Capacitor.isNativePlatform()) {
    await getDB().run(SQL.UPDATE_RESTORE, [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(SQL.UPDATE_RESTORE, [id])
    saveDatabase()
  }
}

export async function markWorkEntryAsSynced(id: number) {
  if (Capacitor.isNativePlatform()) {
    await getDB().run(SQL.UPDATE_SYNCED, [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(SQL.UPDATE_SYNCED, [id])
    saveDatabase()
  }
}

function bindUpdate(s: ReturnType<typeof buildSafeWorkEntry>): unknown[] {
  return [
    s.employee_id, s.workplace_id, s.cost_center_id, s.work_day_id, s.status,
    s.check_in_at, s.check_in_time_at, s.check_in_latitude, s.check_in_longitude, s.check_in_application,
    s.check_out_at, s.check_out_time_at, s.check_out_latitude, s.check_out_longitude, s.check_out_application,
    s.break, s.meal_benefit_has_breakfast, s.meal_benefit_has_lunch, s.name, s.type, s.personalNumber,
    s.administrator_comment, s.total_working_seconds, s.total_break_seconds, s.hasError,
    s.updatedBy, s.createdAt, s.updatedAt, s.deleted_at, s.synced, s.deleted, s.id
  ]
}

function bindInsertWithId(s: ReturnType<typeof buildSafeWorkEntry>): unknown[] {
  return [
    s.id, s.employee_id, s.workplace_id, s.cost_center_id, s.work_day_id, s.status,
    s.check_in_at, s.check_in_time_at, s.check_in_latitude, s.check_in_longitude, s.check_in_application,
    s.check_out_at, s.check_out_time_at, s.check_out_latitude, s.check_out_longitude, s.check_out_application,
    s.break, s.meal_benefit_has_breakfast, s.meal_benefit_has_lunch, s.name, s.type, s.personalNumber,
    s.administrator_comment, s.total_working_seconds, s.total_break_seconds, s.hasError,
    s.updatedBy, s.createdAt, s.updatedAt, s.deleted_at, s.synced, s.deleted
  ]
}

function bindInsertAutoId(s: ReturnType<typeof buildSafeWorkEntry>): unknown[] {
  return [
    s.employee_id, s.workplace_id, s.cost_center_id, s.work_day_id, s.status,
    s.check_in_at, s.check_in_time_at, s.check_in_latitude, s.check_in_longitude, s.check_in_application,
    s.check_out_at, s.check_out_time_at, s.check_out_latitude, s.check_out_longitude, s.check_out_application,
    s.break, s.meal_benefit_has_breakfast, s.meal_benefit_has_lunch, s.name, s.type, s.personalNumber,
    s.administrator_comment, s.total_working_seconds, s.total_break_seconds, s.hasError,
    s.updatedBy, s.createdAt, s.updatedAt, s.deleted_at, s.synced, s.deleted
  ]
}

export async function upsertWorkEntry(entry: Partial<WorkEntry> | SafeWorkEntry) {
  // Accept SafeWorkEntry directly or normalize Partial<WorkEntry>
  const safeEntry = (typeof entry.meal_benefit_has_breakfast === 'number') ? entry as SafeWorkEntry : buildSafeWorkEntry(entry)
  console.log('[4a. REPO] 💾 upsertWorkEntry', safeEntry)

  if (Capacitor.isNativePlatform()) {
    const db = getDB()
    let rowExists = false
    if (safeEntry.id != null) {
      const res = await db.query(SQL.SELECT_ID, [safeEntry.id])
      rowExists = !!(res.values && res.values.length)
    }
    if (rowExists) {
      await db.run(SQL.UPDATE_FULL, bindUpdate(safeEntry))
    } else {
      if (safeEntry.id != null) {
        await db.run(SQL.INSERT_WITH_ID, bindInsertWithId(safeEntry))
      } else {
        await db.run(SQL.INSERT_AUTO_ID, bindInsertAutoId(safeEntry))
      }
    }
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    let rowExists = false
    if (safeEntry.id != null) {
      const results = sqlJsDb.exec(SQL.SELECT_ID, [safeEntry.id])
      rowExists = results.length > 0 && results[0].values.length > 0
    }
    if (rowExists) {
      sqlJsDb.run(SQL.UPDATE_FULL, bindUpdate(safeEntry))
    } else {
      if (safeEntry.id != null) {
        sqlJsDb.run(SQL.INSERT_WITH_ID, bindInsertWithId(safeEntry))
      } else {
        sqlJsDb.run(SQL.INSERT_AUTO_ID, bindInsertAutoId(safeEntry))
      }
    }
    saveDatabase()
  }
}

export async function permanentDeleteWorkEntry(id: number) {
  if (Capacitor.isNativePlatform()) {
    await getDB().run(SQL.DELETE_BY_ID, [id])
  } else {
    const { sqlJsDb, saveDatabase } = getDB() as any
    sqlJsDb.run(SQL.DELETE_BY_ID, [id])
    saveDatabase()
  }
}

// Re-export from mapper and helpers so callers can keep importing from repo
export { workEntryToEntry } from './work-entry.mapper'
export { calculateTotalWorkingSeconds } from './work-entry.helpers'
