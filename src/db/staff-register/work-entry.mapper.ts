/**
 * Mapping layer: raw DB rows ↔ WorkEntry ↔ Entry (view type).
 * No SQL or DB access; uses schema for validation.
 */

import type { Entry } from '@/views/staffRegister/types'
import type { TimeRegistrationApplication } from '@/enums/TimeRegistrationApplication'
import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'
import type { WorkEntry, WorkEntryColumn } from './work-entry.schema'
import { WORK_ENTRY_COLUMNS, parseWorkEntryRow } from './work-entry.schema'

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

/** Map WorkEntry (DB type) to Entry (view/API type). */
export function workEntryToEntry(w: WorkEntry): Entry {
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
