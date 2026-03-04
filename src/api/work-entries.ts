import type { Entry } from '@/views/staffRegister/types'

// Dynamically select API URL for browser vs iOS simulator
function getApiUrl() {
  // If running in browser (localhost or 127.0.0.1), use localhost
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:3002/entries'
  }

  // Otherwise, use your Mac's LAN IP (for iOS simulator)
  return 'http://172.16.175.87:3002/entries'
}

const API_URL = getApiUrl()

function createLocalEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`
  }

  const part = () => Math.random().toString(16).slice(2, 10)

  return `local-${part()}-${part()}-${part()}-${part()}`
}

function normalizeEntryFromApi(raw: Entry): Entry {
  const rawId = (raw as unknown as { id?: string | number | null }).id

  const normalizedId =
    typeof rawId === 'string'
      ? rawId
      : rawId !== null && rawId !== undefined
        ? String(rawId)
        : createLocalEntryId()

  return {
    ...raw,
    id: normalizedId,
    remote_id: raw.remote_id ?? null
  }
}

/**
 * Fetch with exponential backoff retry for connection errors
 */
async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      return response
    }
 catch (error) {
      lastError = error as Error

      // Only retry on connection errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        if (attempt < maxRetries - 1) {
          const delay = 100 * Math.pow(2, attempt) // 100ms, 200ms, 400ms

          await new Promise((r) => setTimeout(r, delay))

          continue
        }
      }

      throw error
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

/**
 * Fetches all staff register entries from the API, flat list (alla dagar sammanslagna)
 */
export async function fetchWorkEntries(): Promise<Entry[]> {
  const response = await fetchWithRetry(API_URL)

  const rows = (await response.json()) as Entry[]

  return rows.map(normalizeEntryFromApi)
}

export async function createEntry(item: Entry): Promise<Entry> {
  const localId = typeof item.id === 'string' && item.id.trim().length > 0
    ? item.id.trim()
    : createLocalEntryId()

  const now = new Date().toISOString()

  const entryToCreate = {
    ...item,
    id: localId,
    remote_id: item.remote_id ?? null,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
    synced: item.synced ?? 0,
    deleted: item.deleted ?? 0
  }

  console.debug('[8. API] 🌐 POST to API, creating entry:', entryToCreate.id)

  const response = await fetchWithRetry(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryToCreate)
  })

  if (!response.ok) throw new Error(`Failed to create entry: ${response.statusText}`)

  const result = await response.json()

  const normalized = normalizeEntryFromApi(result as Entry)

  if (normalized.id !== localId) {
    return {
      ...normalized,
      id: localId,
      remote_id: normalized.id
    }
  }

  console.debug('[9. API] ✅ Entry created in API, id:', normalized.id)

  return normalized
}

export async function updateEntry(item: Entry): Promise<Entry> {
  const now = new Date().toISOString()

  const remoteKey = item.remote_id ?? item.id

  const currentResponse = await fetchWithRetry(`${API_URL}/${remoteKey}`)

  if (!currentResponse.ok) throw new Error(`Failed to fetch entry: ${currentResponse.statusText}`)

  const current = await currentResponse.json()

  const entryToUpdate = {
    ...current,
    ...item,
    createdAt: current.createdAt ?? item.createdAt ?? now,
    updatedAt: now
  }

  const response = await fetchWithRetry(`${API_URL}/${remoteKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryToUpdate)
  })

  if (!response.ok) throw new Error(`Failed to update entry: ${response.statusText}`)

  const updated = normalizeEntryFromApi((await response.json()) as Entry)

  return {
    ...updated,
    id: item.id,
    remote_id: item.remote_id ?? (updated.id !== item.id ? updated.id : null)
  }
}

/**
 * Delete an entry on the API. Local DB cleanup is done by SyncEngine (permanentDelete) after success.
 */
export async function deleteEntry(id: string | number): Promise<void> {
  const response = await fetchWithRetry(`${API_URL}/${id}`, { method: 'DELETE' })

  // 404 = already deleted on server, treat as success
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete entry ${id}: ${response.statusText}`)
  }
}
