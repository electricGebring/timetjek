// Type definition for a work_entry row in database
export interface WorkEntry {
  id: number | null
  work_day_id: number | null
  name: string
  type: string
  personalNumber: string
  timeIn: string | null
  timeOut: string | null
  break: number | null
  workTime: number | null
  status: number | null
  statusType: number | null
  hasError: number
  updatedBy: number | null
  updatedAt: string | null
  createdAt: string | null
  synced: number
  deleted: number
}
