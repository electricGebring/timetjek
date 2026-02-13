/**
 * Types for staff-register domain
 */
export type WorkEntry = {
  id: number | null
  work_day_id: number
  check_in_at: string | null
  check_out_at: string | null
  break: string | null
  total_working_seconds: number | null
  total_break_seconds: number | null
  status: string
  createdAt: string
  updatedAt: string
  deleted_at: string | null
  synced: number
  deleted: number
}

export type DayGroup = { date: string; dateLabel: string; entries: WorkEntry[] }

export type EntryWithTimes = {
  check_in_at?: string | null
  check_out_at?: string | null
}

