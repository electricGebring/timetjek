import type { Entry } from '@/views/staffRegister/types'
import { createLocalWorkEntryId } from '@/db/work-entries/work-entry.helpers'

/** Break shape for batch payload (minimal fields for upsert) */
export type BatchBreakInput = {
  id?: string
  /** Client local id; API uses for mapping, returns server id in breakIdMap */
  local_id?: string
  work_entry_id: string
  start_at: string | null
  end_at: string | null
  start_exact_at: string | null
  end_exact_at: string | null
}

/** Payload for batch upsert block endpoint */
export type BatchBlockPayload = {
  entry: Entry & { local_id?: string }
  breaks: BatchBreakInput[]
  breakIdsToDelete: string[]
}

// Dynamically select API URL, preferring configuration over hard-coded IPs
function getApiUrl() {
  // Prefer a configured base URL if available (e.g. via Vite env)
  const envBaseUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) ||
    undefined
  let baseUrl = envBaseUrl as string | undefined

  // If no env base URL is provided, derive it from window.location when available
  if (!baseUrl) {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname } = window.location
      const port = '3002'
      baseUrl = `${protocol}//${hostname}:${port}`
    } else {
      // Fallback for non-browser environments
      baseUrl = 'http://localhost:3002'
    }
  }

  // Ensure no trailing slash before appending the entries path
  baseUrl = baseUrl.replace(/\/+$/, '')
  return `${baseUrl}/entries`
}

const API_URL = getApiUrl()

function normalizeEntryFromApi(raw: Entry): Entry {
  const normalizedId =
    typeof raw.id === 'string'
      ? raw.id.trim().length > 0
        ? raw.id.trim()
        : createLocalWorkEntryId()
      : createLocalWorkEntryId()

  const normalizedRemoteId =
    typeof raw.remote_id === 'string'
      ? raw.remote_id.trim().length > 0
        ? raw.remote_id.trim()
        : null
      : typeof raw.remote_id === 'number'
        ? String(raw.remote_id)
        : null

  // Option B: API returns id as server id; treat as remote_id when not explicitly set
  const remoteId = normalizedRemoteId ?? (normalizedId ? normalizedId : null)

  return {
    ...raw,
    id: normalizedId,
    remote_id: remoteId
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
    } catch (error) {
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
 * Fetches all work entries from the API, returned as a flat list (alla dagar sammanslagna)
 */
export async function fetchWorkEntries(): Promise<Entry[]> {
  const response = await fetchWithRetry(API_URL)
  const payload = (await response.json()) as Entry[]

  return payload.map(normalizeEntryFromApi)
}

/**
 * Fetches work entries updated since the given Unix timestamp (seconds).
 * Uses ?since= for incremental sync.
 */
export async function fetchWorkEntriesSince(since: number): Promise<Entry[]> {
  const url = since > 0 ? `${API_URL}?since=${since}` : API_URL
  const response = await fetchWithRetry(url)
  const payload = (await response.json()) as Entry[]

  return payload.map(normalizeEntryFromApi)
}

export async function createEntry(item: Entry): Promise<Entry> {
  const now = new Date().toISOString()

  // Generate UUID-based local ID if not provided
  const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : createLocalWorkEntryId()

  const entryToCreate = {
    ...item,
    id,
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

  console.debug('[9. API] ✅ Entry created in API, id:', result.id)

  return result
}

export async function updateEntry(item: Entry): Promise<Entry> {
  const now = new Date().toISOString()

  const currentResponse = await fetchWithRetry(`${API_URL}/${item.id}`)

  if (!currentResponse.ok) throw new Error(`Failed to fetch entry: ${currentResponse.statusText}`)

  const current = await currentResponse.json()

  const entryToUpdate = {
    ...current,
    ...item,
    createdAt: current.createdAt ?? item.createdAt ?? now,
    updatedAt: now
  }

  const response = await fetchWithRetry(`${API_URL}/${item.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryToUpdate)
  })

  if (!response.ok) throw new Error(`Failed to update entry: ${response.statusText}`)

  return response.json()
}

/**
 * Batch upsert one work-entry block (entry + breaks) in a single request.
 * Avoids partial state if connection drops mid-sync.
 * API returns server IDs; response includes entry with id=server id and breakIdMap for local->remote mapping.
 */
export async function batchUpsertBlock(
  payload: BatchBlockPayload
): Promise<{ entry: Entry; breakIdMap: Record<string, string> }> {
  const response = await fetchWithRetry(`${API_URL}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!response.ok) throw new Error(`Failed to batch upsert block: ${response.statusText}`)
  const result = (await response.json()) as {
    entry: Entry
    breakIdMap?: Record<string, string>
  }
  return {
    entry: normalizeEntryFromApi(result.entry),
    breakIdMap: result.breakIdMap ?? {}
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
