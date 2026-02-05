export interface Entry {
  id: number
  createdAt: string
  name: string
  type: string
  personalNumber: string
  timeIn: string
  timeOut: string | null
  break: string | null
  workTime: string | null
  status: string | null
  statusType: string
  hasError?: boolean
  updatedBy?: string
  updatedAt?: string
  synced: number
  deleted: number
  work_day_id?: number
}

interface Day {
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
    entries: any[]
  }>
}