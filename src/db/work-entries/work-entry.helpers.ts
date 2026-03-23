import { TimeRegistrationStatus } from '../../enums/TimeRegistrationStatus.ts'

/** Generate a stable device identifier for attribution (Option C). */
export function getDeviceId(): string {
  if (typeof localStorage !== 'undefined') {
    let id = localStorage.getItem('timetjek_device_id')

    if (!id) {
      id = uuidLike()

      localStorage.setItem('timetjek_device_id', id)
    }

    return id
  }

  return `anon-${uuidLike()}`
}

/** Normalized shape for DB bindings (numbers for booleans, required defaults). */
export type SafeWorkEntry = {
  id: string
  remote_id: string | null
  device_id: string | null
  employee_id: number
  workplace_id: number
  cost_center_id: number | null
  work_day_id: number | null
  status: string
  check_in_at: string
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
  meal_benefit_has_breakfast: number
  meal_benefit_has_lunch: number
  name: string
  type: string
  personalNumber: string
  administrator_comment: string | null
  total_working_seconds: number | null
  total_break_seconds: number | null
  hasError: number
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  deleted_at: string | null
  synced: number
  deleted: number
}

const nowIso = (): string => new Date().toISOString()

const uuidLike = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const part = () => Math.random().toString(16).slice(2, 10)

  return `${part()}-${part()}-${part()}-${part()}`
}

export function createLocalWorkEntryId(): string {
  return uuidLike()
}

/** Normalize a partial entry into a SafeWorkEntry for parameterized SQL. */
export function buildSafeWorkEntry(entry: Record<string, unknown>): SafeWorkEntry {
  const resolvedId =
    typeof entry.id === 'string' && entry.id.trim().length > 0
      ? entry.id.trim()
      : typeof entry.id === 'number'
        ? String(entry.id)
        : createLocalWorkEntryId()

  const resolvedRemoteId =
    typeof entry.remote_id === 'string'
      ? entry.remote_id.trim().length > 0
        ? entry.remote_id.trim()
        : null
      : typeof entry.remote_id === 'number'
        ? String(entry.remote_id)
        : null

  const resolvedDeviceId =
    typeof entry.device_id === 'string' && entry.device_id.trim().length > 0 ? entry.device_id.trim() : getDeviceId()

  return {
    id: resolvedId,
    remote_id: resolvedRemoteId,
    device_id: resolvedDeviceId,
    employee_id: (entry.employee_id as number) ?? 1,
    workplace_id: (entry.workplace_id as number) ?? 1,
    cost_center_id: (entry.cost_center_id as number) ?? null,
    work_day_id: (entry.work_day_id as number) ?? null,
    status: (entry.status as string) ?? TimeRegistrationStatus.OPEN,
    check_in_at: (entry.check_in_at as string) ?? nowIso(),
    check_in_time_at: (entry.check_in_time_at as string) ?? null,
    check_in_latitude: (entry.check_in_latitude as number) ?? null,
    check_in_longitude: (entry.check_in_longitude as number) ?? null,
    check_in_application: (entry.check_in_application as string) ?? 'APP',
    check_out_at: (entry.check_out_at as string) ?? null,
    check_out_time_at: (entry.check_out_time_at as string) ?? null,
    check_out_latitude: (entry.check_out_latitude as number) ?? null,
    check_out_longitude: (entry.check_out_longitude as number) ?? null,
    check_out_application: (entry.check_out_application as string) ?? null,
    break: (entry.break as string) ?? null,
    meal_benefit_has_breakfast: (entry.meal_benefit_has_breakfast as boolean) ? 1 : 0,
    meal_benefit_has_lunch: (entry.meal_benefit_has_lunch as boolean) ? 1 : 0,
    name: (entry.name as string) ?? '',
    type: (entry.type as string) ?? '',
    personalNumber: (entry.personalNumber as string) ?? '',
    administrator_comment: (entry.administrator_comment as string) ?? null,
    total_working_seconds: (entry.total_working_seconds as number) ?? null,
    total_break_seconds: (entry.total_break_seconds as number) ?? null,
    hasError: (entry.hasError as number) ?? 0,
    updatedBy: (entry.updatedBy as string) ?? null,
    createdAt: (entry.createdAt as string) ?? nowIso(),
    updatedAt: (entry.updatedAt as string) ?? nowIso(),
    deleted_at: (entry.deleted_at as string) ?? null,
    synced: (entry.synced as number) ?? 0,
    deleted: (entry.deleted as number) ?? 0
  }
}

/**
 * Calculate total working seconds from check-in/check-out and optional break.
 * For break entries, duration is derived from break string (e.g. "11:00:00-11:30:00").
 */
export function calculateTotalWorkingSeconds(
  checkInAt: string,
  checkOutAt: string | null,
  breakStr: string | null
): number | null {
  if (!checkOutAt) return null

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

      return Math.max(0, breakSeconds)
    }

    return null
  }

  const checkIn = new Date(checkInAt).getTime()

  const checkOut = new Date(checkOutAt).getTime()

  const totalSeconds = Math.floor((checkOut - checkIn) / 1000)

  return Math.max(0, totalSeconds)
}
