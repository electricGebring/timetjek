export type { DayGroup } from '@/domain/staff-register/types'
import type { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

export type { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

import type { TimeRegistrationApplication } from '@/enums/TimeRegistrationApplication'

export type { TimeRegistrationApplication } from '@/enums/TimeRegistrationApplication'

export interface Entry {
  // Identification
  id: number
  employee_id: number
  workplace_id: number
  cost_center_id: number | null
  work_day_id: number

  // Status
  status: TimeRegistrationStatus

  // Check-in data
  check_in_at: string
  check_in_time_at: string
  check_in_latitude: number
  check_in_longitude: number
  check_in_application: TimeRegistrationApplication

  // Check-out data
  check_out_at: string | null
  check_out_time_at: string | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  check_out_application: TimeRegistrationApplication | null

  // Break and meal benefits
  break: string | null
  meal_benefit_has_breakfast: boolean
  meal_benefit_has_lunch: boolean

  // Personal info
  name: string
  type: string
  personalNumber: string

  // Metadata
  administrator_comment: string | null
  total_working_seconds: number | null
  createdAt: string
  updatedAt: string
  deleted_at: string | null

  // Sync
  synced: number
  deleted: number
}

export interface Day {
  date: string
  dateLabel: string
  entries: Entry[]
}

export interface WorkSchemeTypes {
  dateRange: string
  company: string
  workplace: string
  totalWorkTime: string
  days: Day[]
}

export interface GroupedWorkEntries {
  days: Array<{
    date: string
    dateLabel: string
    entries: Entry[]
  }>
}
