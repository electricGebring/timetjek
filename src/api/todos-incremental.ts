/**
 * Incremental sync API client
 * Fetches only changes since last sync timestamp
 */

interface Todo {
  id: number
  title: string
  done: number
  updatedAt?: number
}

const API_URL = 'http://localhost:3001/todos'

/**
 * Fetch todos that have been updated since the given timestamp
 * This enables incremental sync - only fetch what changed
 */
export async function fetchTodosSince(timestamp: number): Promise<Todo[]> {
  // Query parameter for incremental sync
  // Backend should support: ?since=1234567890 or ?updatedAfter=1234567890
  const response = await fetch(`${API_URL}?updatedAfter=${timestamp}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch todos: ${response.status}`)
  }

  const todos = await response.json()
  // Ensure updatedAt is present (convert to Unix timestamp in seconds if needed)
  return todos.map((todo: any) => ({
    ...todo,
    updatedAt: todo.updatedAt ? Math.floor(todo.updatedAt / 1000) : Math.floor(Date.now() / 1000)
  }))
}

/**
 * Fetch todos with pagination support
 * Useful for large datasets
 */
export async function fetchTodosPaginated(
  page: number = 1,
  pageSize: number = 100,
  since?: number
): Promise<{ todos: Todo[]; hasMore: boolean; total?: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  
  if (since) {
    params.append('updatedAfter', since.toString())
  }

  const response = await fetch(`${API_URL}?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch todos: ${response.status}`)
  }

  const data = await response.json()
  
  // Handle different API response formats
  if (Array.isArray(data)) {
    return {
      todos: data.map((todo: any) => ({
        ...todo,
        updatedAt: todo.updatedAt ? Math.floor(todo.updatedAt / 1000) : Math.floor(Date.now() / 1000)
      })),
      hasMore: data.length === pageSize,
    }
  }

  // If API returns paginated response
  return {
    todos: (data.items || data.todos || []).map((todo: any) => ({
      ...todo,
      updatedAt: todo.updatedAt ? Math.floor(todo.updatedAt / 1000) : Math.floor(Date.now() / 1000)
    })),
    hasMore: data.hasMore ?? (data.items?.length === pageSize),
    total: data.total,
  }
}

/**
 * Batch create/update todos
 * More efficient than individual API calls
 */
export async function batchUpsertTodos(todos: Todo[]): Promise<Todo[]> {
  const response = await fetch(`${API_URL}/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ todos }),
  })

  if (!response.ok) {
    throw new Error(`Batch upsert failed: ${response.status}`)
  }

  const result = await response.json()
  return (result.todos || result).map((todo: any) => ({
    ...todo,
    updatedAt: todo.updatedAt ? Math.floor(todo.updatedAt / 1000) : Math.floor(Date.now() / 1000)
  }))
}

/**
 * Batch delete todos
 */
export async function batchDeleteTodos(ids: number[]): Promise<void> {
  const response = await fetch(`${API_URL}/batch`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Batch delete failed: ${response.status}`)
  }
}
