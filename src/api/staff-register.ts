import type { Entry } from '@/views/staffRegister/types'

const API_URL = 'http://localhost:3002/entries'

/**
 * Fetches all staff register entries from the API, flat list (alla dagar sammanslagna)
 */
export async function fetchStaffRegisterEntries(): Promise<Entry[]> {
  const response = await fetch(API_URL)
  return response.json()
}

export async function createEntry(item: Entry): Promise<Entry> {
  console.log('Creating new entry via API:', item)

  const allEntries = await fetchStaffRegisterEntries()
  const maxId = Math.max(...allEntries.map(e => e.id || 0), 0)
  const newId = maxId + 1

  const now = new Date().toISOString()

  const entryToCreate = {
    ...item,
    id: newId,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
    synced: item.synced ?? 0,
    deleted: item.deleted ?? 0
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryToCreate)
  })

  if (!response.ok) throw new Error(`Failed to create entry: ${response.statusText}`)
  return response.json()
}

export async function updateEntry(item: Entry): Promise<Entry> {
  console.log('Updating entry via API:', item)

  const now = new Date().toISOString()
  const currentResponse = await fetch(`${API_URL}/${item.id}`)
  if (!currentResponse.ok) throw new Error(`Failed to fetch entry: ${currentResponse.statusText}`)
  const current = await currentResponse.json()

  const entryToUpdate = {
    ...current,
    ...item,
    createdAt: current.createdAt ?? item.createdAt ?? now,
    updatedAt: now
  }

  const response = await fetch(`${API_URL}/${item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryToUpdate)
  })

  if (!response.ok) throw new Error(`Failed to update entry: ${response.statusText}`)
  return response.json()
}
