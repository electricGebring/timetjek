import type { Entry } from '@/views/staffRegister/types'

import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

import type { WorkEntry } from '@/db/schema'

import { createLocalWorkEntryId } from './work-entry.helpers'

/** Accepts WorkEntry (Drizzle) or any object with WorkEntry-like properties */
export type AnyWorkEntry = WorkEntry | Record<string, unknown>

/** Map WorkEntry (DB) to Entry (view/API). Only overrides fields that need coercion. */
export function workEntryToEntry(w: AnyWorkEntry): Entry {
  const raw = w as Record<string, unknown>

  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : typeof raw.id === 'number'
        ? String(raw.id)
        : createLocalWorkEntryId()

  return {
    ...raw,
    id,
    remote_id: raw.remote_id ?? null,
    device_id: raw.device_id ?? null,
    employee_id: (raw.employee_id as number) ?? 1,
    workplace_id: (raw.workplace_id as number) ?? 1,
    cost_center_id: (raw.cost_center_id as number) ?? null,
    work_day_id: (raw.work_day_id as number) ?? 0,
    status: (raw.status as string) ?? TimeRegistrationStatus.OPEN,
    check_in_at: (raw.check_in_at as string) ?? '',
    check_in_time_at: (raw.check_in_time_at as string) ?? '',
    check_in_latitude: (raw.check_in_latitude as number) ?? 0,
    check_in_longitude: (raw.check_in_longitude as number) ?? 0,
    check_in_application: (raw.check_in_application as string) ?? 'APP',
    check_out_at: raw.check_out_at ?? null,
    check_out_time_at: raw.check_out_time_at ?? null,
    check_out_latitude: raw.check_out_latitude ?? null,
    check_out_longitude: raw.check_out_longitude ?? null,
    check_out_application: raw.check_out_application ?? null,
    break: raw.break ?? null,
    meal_benefit_has_breakfast: Boolean(raw.meal_benefit_has_breakfast),
    meal_benefit_has_lunch: Boolean(raw.meal_benefit_has_lunch),
    name: (raw.name as string) ?? '',
    type: (raw.type as string) ?? '',
    personalNumber: (raw.personalNumber as string) ?? '',
    administrator_comment: raw.administrator_comment ?? null,
    total_working_seconds: (raw.total_working_seconds as number) ?? null,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
    deleted_at: raw.deleted_at ?? null,
    synced: (raw.synced as number) ?? 0,
    deleted: (raw.deleted as number) ?? 0
  } as Entry
}

/** Map Entry (view/API) to WorkEntry (DB). Only overrides meal booleans to 0|1. */
export function entryToWorkEntry(e: Entry): Record<string, unknown> {
  return {
    ...e,
    meal_benefit_has_breakfast: e.meal_benefit_has_breakfast ? 1 : 0,
    meal_benefit_has_lunch: e.meal_benefit_has_lunch ? 1 : 0
  } as unknown as Record<string, unknown>
}
