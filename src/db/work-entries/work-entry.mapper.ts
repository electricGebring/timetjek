import type { Entry } from '../../views/staffRegister/types.ts'

import type { TimeRegistrationApplication } from '../../enums/TimeRegistrationApplication.ts'

import { TimeRegistrationStatus } from '../../enums/TimeRegistrationStatus.ts'

import type { WorkEntry, WorkEntryColumn } from '../../models/work-entry.schema.ts'

import { WORK_ENTRY_COLUMNS, parseWorkEntryRow } from '../../models/work-entry.schema.ts'

import type { WorkEntry as DrizzleWorkEntry } from '../schema.ts'
import { createLocalWorkEntryId } from './work-entry.helpers.ts'

// Flexible type for mapper functions - accepts any object with WorkEntry-like properties
export type AnyWorkEntry = Record<string, unknown>

/** Build a record from a row array using column order (same as WORK_ENTRY_COLUMNS). */
export function rowToRecord(
  row: unknown[],
  columns: readonly WorkEntryColumn[] = WORK_ENTRY_COLUMNS
): Record<string, unknown> {
  const record: Record<string, unknown> = {}

  columns.forEach((col, i) => {
    record[col] = row[i]
  })

  return record
}

/** Map a raw row (array or object) to a validated WorkEntry. */
export function mapRowToWorkEntry(row: unknown): WorkEntry {
  if (Array.isArray(row)) {
    return parseWorkEntryRow(rowToRecord(row))
  }

  if (row && typeof row === 'object') {
    return parseWorkEntryRow(row as Record<string, unknown>)
  }

  return parseWorkEntryRow({})
}

/** Map WorkEntry (DB type - from either Zod or Drizzle schema) to Entry (view/API type). */
export function workEntryToEntry(w: AnyWorkEntry): Entry {
  // Type assertion to access properties - we know this has WorkEntry-like shape
  const entry = w as unknown as (WorkEntry | DrizzleWorkEntry)
  const resolvedId =
    typeof entry.id === 'string'
      ? entry.id.trim().length > 0
        ? entry.id.trim()
        : createLocalWorkEntryId()
      : typeof entry.id === 'number'
        ? String(entry.id)
      : createLocalWorkEntryId()
  
  return {
    id: resolvedId,
    remote_id: entry.remote_id ?? null,
    employee_id: entry.employee_id ?? 1,
    workplace_id: entry.workplace_id ?? 1,
    cost_center_id: entry.cost_center_id ?? null,
    work_day_id: entry.work_day_id ?? 0,
    status: (entry.status ?? TimeRegistrationStatus.OPEN) as Entry['status'],
    check_in_at: entry.check_in_at ?? '',
    check_in_time_at: entry.check_in_time_at ?? '',
    check_in_latitude: entry.check_in_latitude ?? 0,
    check_in_longitude: entry.check_in_longitude ?? 0,
    check_in_application: (entry.check_in_application ?? 'APP') as TimeRegistrationApplication,
    check_out_at: entry.check_out_at ?? null,
    check_out_time_at: entry.check_out_time_at ?? null,
    check_out_latitude: entry.check_out_latitude ?? null,
    check_out_longitude: entry.check_out_longitude ?? null,
    check_out_application: entry.check_out_application as TimeRegistrationApplication | null,
    break: entry.break ?? null,
    meal_benefit_has_breakfast:
      typeof entry.meal_benefit_has_breakfast === 'number'
        ? !!entry.meal_benefit_has_breakfast
        : !!entry.meal_benefit_has_breakfast,
    meal_benefit_has_lunch:
      typeof entry.meal_benefit_has_lunch === 'number' ? !!entry.meal_benefit_has_lunch : !!entry.meal_benefit_has_lunch,
    name: entry.name ?? '',
    type: entry.type ?? '',
    personalNumber: entry.personalNumber ?? '',
    administrator_comment: entry.administrator_comment ?? null,
    total_working_seconds: entry.total_working_seconds ?? null,
    createdAt: entry.createdAt ?? new Date().toISOString(),
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
    deleted_at: entry.deleted_at ?? null,
    synced: entry.synced ?? 0,
    deleted: entry.deleted ?? 0
  }
}

/** Map Entry (view/API type) to Drizzle WorkEntry format (DB type with numbers for booleans). */
export function entryToWorkEntry(e: Entry): AnyWorkEntry {
  return {
    id: e.id,
    remote_id: e.remote_id ?? null,
    employee_id: e.employee_id,
    workplace_id: e.workplace_id,
    cost_center_id: e.cost_center_id,
    work_day_id: e.work_day_id,
    status: e.status,
    check_in_at: e.check_in_at,
    check_in_time_at: e.check_in_time_at,
    check_in_latitude: e.check_in_latitude,
    check_in_longitude: e.check_in_longitude,
    check_in_application: e.check_in_application,
    check_out_at: e.check_out_at,
    check_out_time_at: e.check_out_time_at,
    check_out_latitude: e.check_out_latitude,
    check_out_longitude: e.check_out_longitude,
    check_out_application: e.check_out_application,
    break: e.break,
    meal_benefit_has_breakfast: e.meal_benefit_has_breakfast ? 1 : 0,
    meal_benefit_has_lunch: e.meal_benefit_has_lunch ? 1 : 0,
    name: e.name,
    type: e.type,
    personalNumber: e.personalNumber,
    administrator_comment: e.administrator_comment,
    total_working_seconds: e.total_working_seconds,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    deleted_at: e.deleted_at,
    synced: e.synced,
    deleted: e.deleted
  }
}
