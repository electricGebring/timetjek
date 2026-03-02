import type { Entry } from '../../views/staffRegister/types.ts'

import type { TimeRegistrationApplication } from '../../enums/TimeRegistrationApplication.ts'

import { TimeRegistrationStatus } from '../../enums/TimeRegistrationStatus.ts'

import type { WorkEntry, WorkEntryColumn } from '../../models/work-entry.schema.ts'

import { WORK_ENTRY_COLUMNS, parseWorkEntryRow } from '../../models/work-entry.schema.ts'

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
export function workEntryToEntry(w: any): Entry {
  return {
    id: w.id ?? 0,
    employee_id: w.employee_id ?? 1,
    workplace_id: w.workplace_id ?? 1,
    cost_center_id: w.cost_center_id ?? null,
    work_day_id: w.work_day_id ?? 0,
    status: (w.status ?? TimeRegistrationStatus.OPEN) as Entry['status'],
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
    meal_benefit_has_breakfast:
      typeof w.meal_benefit_has_breakfast === 'number'
        ? !!w.meal_benefit_has_breakfast
        : !!w.meal_benefit_has_breakfast,
    meal_benefit_has_lunch:
      typeof w.meal_benefit_has_lunch === 'number' ? !!w.meal_benefit_has_lunch : !!w.meal_benefit_has_lunch,
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

/** Map Entry (view/API type) to Drizzle WorkEntry format (DB type with numbers for booleans). */
export function entryToWorkEntry(e: Entry): any {
  return {
    id: e.id,
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
