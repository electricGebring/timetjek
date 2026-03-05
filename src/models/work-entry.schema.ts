/**
 * WorkEntry schema and types – now using pure TypeScript (no Zod)
 * Single source of truth: this file defines the work_entries table structure.
 * 
 * Raw values from SQL:
 * - Numbers: database INTEGER/REAL
 * - Strings: database TEXT
 * - Nulls: database NULL
 * - Booleans: database INTEGER (0/1) → converted to boolean
 */

/** WorkEntry type – matches database schema */
export type WorkEntry = {
  id: string | null
  remote_id: string | null
  employee_id: number
  workplace_id: number
  cost_center_id: number | null
  work_day_id: number | null
  status: string
  check_in_at: string | null
  check_in_time_at: string | null
  check_in_latitude: number | null
  check_in_longitude: number | null
  check_in_application: string
  check_out_at: string | null
  check_out_time_at: string | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_out_application: string | null
  break: string | null
  meal_benefit_has_breakfast: boolean
  meal_benefit_has_lunch: boolean
  name: string
  type: string
  personalNumber: string
  administrator_comment: string | null
  total_working_seconds: number | null
  total_break_seconds: number | null
  hasError: number
  updatedBy: string | null
  createdAt: string | null
  updatedAt: string | null
  deleted_at: string | null
  synced: number
  deleted: number
}

/** Column names in SELECT order – derived from WorkEntry keys */
export const WORK_ENTRY_COLUMNS = [
  'id',
  'remote_id',
  'employee_id',
  'workplace_id',
  'cost_center_id',
  'work_day_id',
  'status',
  'check_in_at',
  'check_in_time_at',
  'check_in_latitude',
  'check_in_longitude',
  'check_in_application',
  'check_out_at',
  'check_out_time_at',
  'check_out_latitude',
  'check_out_longitude',
  'check_out_application',
  'break',
  'meal_benefit_has_breakfast',
  'meal_benefit_has_lunch',
  'name',
  'type',
  'personalNumber',
  'administrator_comment',
  'total_working_seconds',
  'total_break_seconds',
  'hasError',
  'updatedBy',
  'createdAt',
  'updatedAt',
  'deleted_at',
  'synced',
  'deleted'
] as const

export type WorkEntryColumn = (typeof WORK_ENTRY_COLUMNS)[number]

/**
 * Parse a raw row object into a WorkEntry.
 * Handles type coercion: converts 0/1 to boolean, nullish to null, etc.
 */
export function parseWorkEntryRow(raw: Record<string, unknown>): WorkEntry {
  const coerceString = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'string') return v
    return String(v)
  }

  const coerceNumber = (v: unknown): number | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return v
    return null
  }

  const coerceBoolean = (v: unknown): boolean => {
    if (v === 1 || v === true || v === '1') return true
    return false
  }

  return {
    id: coerceString(raw.id),
    remote_id: coerceString(raw.remote_id),
    employee_id: typeof raw.employee_id === 'number' ? raw.employee_id : 1,
    workplace_id: typeof raw.workplace_id === 'number' ? raw.workplace_id : 1,
    cost_center_id: coerceNumber(raw.cost_center_id),
    work_day_id: coerceNumber(raw.work_day_id),
    status: typeof raw.status === 'string' ? raw.status : '',
    check_in_at: coerceString(raw.check_in_at),
    check_in_time_at: coerceString(raw.check_in_time_at),
    check_in_latitude: coerceNumber(raw.check_in_latitude),
    check_in_longitude: coerceNumber(raw.check_in_longitude),
    check_in_application: typeof raw.check_in_application === 'string' ? raw.check_in_application : 'APP',
    check_out_at: coerceString(raw.check_out_at),
    check_out_time_at: coerceString(raw.check_out_time_at),
    check_out_latitude: coerceNumber(raw.check_out_latitude),
    check_out_longitude: coerceNumber(raw.check_out_longitude),
    check_out_application: coerceString(raw.check_out_application),
    break: coerceString(raw.break),
    meal_benefit_has_breakfast: coerceBoolean(raw.meal_benefit_has_breakfast),
    meal_benefit_has_lunch: coerceBoolean(raw.meal_benefit_has_lunch),
    name: typeof raw.name === 'string' ? raw.name : '',
    type: typeof raw.type === 'string' ? raw.type : '',
    personalNumber: typeof raw.personalNumber === 'string' ? raw.personalNumber : '',
    administrator_comment: coerceString(raw.administrator_comment),
    total_working_seconds: coerceNumber(raw.total_working_seconds),
    total_break_seconds: coerceNumber(raw.total_break_seconds),
    hasError: typeof raw.hasError === 'number' ? raw.hasError : 0,
    updatedBy: coerceString(raw.updatedBy),
    createdAt: coerceString(raw.createdAt),
    updatedAt: coerceString(raw.updatedAt),
    deleted_at: coerceString(raw.deleted_at),
    synced: typeof raw.synced === 'number' ? raw.synced : 0,
    deleted: typeof raw.deleted === 'number' ? raw.deleted : 0
  }
}
