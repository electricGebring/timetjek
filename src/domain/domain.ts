/**
 * Domain layer that handles business logic and validation.
 * Communicates with the database repository.
 */

import * as todosRepo from '@/db/todos/repo'

// Callback for triggering sync after mutations
let syncCallback: (() => void) | null = null

export function onMutation(callback: () => void) {
  syncCallback = callback
}

/**
 * Gets all todos from local database
 */
export async function getAll() {
  return await todosRepo.getTodos()
}

/**
 * Updates store with merged todos (called by syncService)
 */
export async function updateStoreFromDb() {
  const allTodos = await getAll()
  
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(allTodos)
}

/**
 * Creates a new todo with validation (offline-first)
 */
export async function create(title: string) {
  // Business logic & validation
  if (!title || title.trim().length === 0) {
    throw new Error('Title cannot be empty')
  }
  
  if (title.length > 200) {
    throw new Error('Title is too long (max 200 characters)')
  }
  
  // Always save to local database (offline-first)
  await todosRepo.addTodo(title.trim())
  
  // Update store with local data
  const localTodos = await getAll()
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(localTodos)
  
  // Trigger sync if callback is registered
  if (syncCallback) {
    syncCallback()
  }
}


/**
 * Deletes a todo (offline-first)
 */
export async function deleteTodo(id: number) {
  // Always delete from local database
  await todosRepo.deleteTodo(id)
  
  // Update store with local data
  const localTodos = await getAll()
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(localTodos)
  
  // Trigger sync if callback is registered
  if (syncCallback) {
    syncCallback()
  }
}