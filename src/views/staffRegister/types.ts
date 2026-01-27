export interface Entry {
  id: number
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