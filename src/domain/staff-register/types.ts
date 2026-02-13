/**
 * Types for staff-register domain
 */


import type { WorkEntry } from '@/models/work-entry.schema'
export type DayGroup = { date: string; dateLabel: string; entries: WorkEntry[] }

export type EntryWithTimes = {
  check_in_at?: string | null
  check_out_at?: string | null
}

