import type { WorkEntry } from '@/db/schema'

export type DayGroup = { date: string; dateLabel: string; entries: WorkEntry[] }

export type EntryWithTimes = {
  check_in_at?: string | null
  check_out_at?: string | null
}
