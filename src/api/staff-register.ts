import type { Entry } from '@/views/staffRegister/types'

const API_URL = 'http://localhost:3002/workScheme'

/**
 * Fetches all staff register entries from the API, flat list (alla dagar sammanslagna)
 */
export async function fetchStaffRegisterEntries(): Promise<Entry[]> {
  const response = await fetch(API_URL)
  const data = await response.json()
  if (!data[0]?.days) return []
  const flat = data[0].days.flatMap((day: any) =>
    day.entries.map((entry: any) => ({
      ...entry,
      work_day_id: day.date
    }))
  )
  return flat
}
