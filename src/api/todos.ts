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
export async function createTodo(title: string): Promise<Todo> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      done: 0
    })
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
