import type { WorkSchemeTypes } from '@/views/staffRegister/types'

const API_URL = 'http://localhost:3002/workScheme'

export async function fetchWorkSchemeData(): Promise<WorkSchemeTypes> {
  const response = await fetch(API_URL)
  const data = await response.json()
  return data[0]  // Returnera första elementet i arrayen
}