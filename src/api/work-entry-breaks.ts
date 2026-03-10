import type { WorkEntryBreak, CreateWorkEntryBreakInput } from '@/models/work-entry-break.schema'

function getBreaksApiUrl() {
  const envBaseUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) ||
    undefined
  let baseUrl = envBaseUrl as string | undefined

  if (!baseUrl) {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname } = window.location
      const port = '3002'
      baseUrl = `${protocol}//${hostname}:${port}`
    } else {
      baseUrl = 'http://localhost:3002'
    }
  }

  baseUrl = baseUrl.replace(/\/+$/, '')
  return `${baseUrl}/work_entry_breaks`
}

const BREAKS_API_URL = getBreaksApiUrl()

async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error as Error
      if (error instanceof TypeError && error.message.includes('Failed to fetch') && attempt < maxRetries - 1) {
        const delay = 100 * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}

export async function fetchWorkEntryBreaks(): Promise<WorkEntryBreak[]> {
  const response = await fetchWithRetry(BREAKS_API_URL)
  if (!response.ok) throw new Error(`Failed to fetch work entry breaks: ${response.statusText}`)
  return (await response.json()) as WorkEntryBreak[]
}

export async function fetchBreaksByWorkEntryId(workEntryId: string): Promise<WorkEntryBreak[]> {
  const response = await fetchWithRetry(`${BREAKS_API_URL}?work_entry_id=${encodeURIComponent(workEntryId)}`)
  if (!response.ok) throw new Error(`Failed to fetch breaks for work entry ${workEntryId}: ${response.statusText}`)
  return (await response.json()) as WorkEntryBreak[]
}

/**
 * Fetches breaks for multiple work entries (for incremental sync).
 * Uses repeated work_entry_id params; json-server returns breaks matching any.
 */
export async function fetchBreaksForEntryIds(entryIds: string[]): Promise<WorkEntryBreak[]> {
  if (entryIds.length === 0) return []
  const params = entryIds.map((id) => `work_entry_id=${encodeURIComponent(id)}`).join('&')
  const response = await fetchWithRetry(`${BREAKS_API_URL}?${params}`)
  if (!response.ok) throw new Error(`Failed to fetch breaks: ${response.statusText}`)
  return (await response.json()) as WorkEntryBreak[]
}

export async function createWorkEntryBreak(
  workEntryId: string,
  breakData: CreateWorkEntryBreakInput
): Promise<WorkEntryBreak> {
  const payload = {
    work_entry_id: workEntryId,
    start_at: breakData.start_at ?? null,
    end_at: breakData.end_at ?? null,
    start_exact_at: breakData.start_exact_at ?? null,
    end_exact_at: breakData.end_exact_at ?? null,
    created_at: new Date().toISOString()
  }

  const response = await fetchWithRetry(BREAKS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!response.ok) throw new Error(`Failed to create work entry break: ${response.statusText}`)
  return (await response.json()) as WorkEntryBreak
}

export async function updateWorkEntryBreak(
  id: number,
  changes: Partial<Pick<WorkEntryBreak, 'start_at' | 'end_at' | 'start_exact_at' | 'end_exact_at'>>
): Promise<WorkEntryBreak> {
  const response = await fetchWithRetry(`${BREAKS_API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })

  if (!response.ok) throw new Error(`Failed to update work entry break ${id}: ${response.statusText}`)
  return (await response.json()) as WorkEntryBreak
}

export async function deleteWorkEntryBreak(id: string): Promise<void> {
  const response = await fetchWithRetry(`${BREAKS_API_URL}/${id}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete work entry break ${id}: ${response.statusText}`)
  }
}
