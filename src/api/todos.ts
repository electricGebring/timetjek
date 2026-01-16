interface Todo {
  id: number
  title: string
  done: number
}

const API_URL = 'http://localhost:3001/todos'

/**
 * Fetches todos from json-server API
 */
export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch(API_URL)
  return response.json()
}

/**
 * Creates a new todo via json-server API
 */
export async function createTodo(title: string, id?: number): Promise<Todo> {
  const body: any = { title, done: 0 }
  if (id) body.id = id // Låt API använda lokalt ID
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  return response.json()
}

/**
 * Deletes a todo via API
 */
export async function deleteTodo(id: string | number): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
  // json-server v1 sometimes returns 404 on delete, but it still works
  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete failed: ${response.status}`)
  }
}
