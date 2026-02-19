import type { WorkSchemeTypes } from '@/views/staffRegister/types'

// Dynamically select API URL for browser vs iOS simulator
function getApiUrl() {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:3002/workScheme'
  }

  return 'http://172.16.175.87:3002/workScheme'
}

const API_URL = getApiUrl()

export async function fetchWorkSchemeData(): Promise<WorkSchemeTypes> {
  const response = await fetch(API_URL)

  const data = await response.json()

  return data[0] // Return first element of array
}
