/**
 * Domain layer that handles business logic and validation.
 * Communicates with the database repository.
 * 
 * Note: Sync is handled automatically by the OnlineOfflineCoordinator
 * when connectivity changes. For always-online apps, immediate sync
 * can be triggered on mutations (optional).
 */

import * as todosRepo from '@/db/todos/repo'
import { defaultConflictResolver, type ConflictResolutionStrategy } from '@/sync/conflict-resolver'
import { triggerSyncIfOnline } from './services/sync-trigger'

/**
 * Gets all todos from local database
 */
export async function getAll() {
  return await todosRepo.getTodos()
}

/**
 * Updates store with merged todos (called by SyncEngine after pulling remote changes)
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

  // Optional: Trigger immediate sync if online (for always-online apps)
  // Falls back to coordinator/periodic sync if offline
  await triggerSyncIfOnline('mutation')
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

  // Optional: Trigger immediate sync if online (for always-online apps)
  // Falls back to coordinator/periodic sync if offline
  await triggerSyncIfOnline('mutation')
}

/**
 * Merges a remote todo with local data, resolving conflicts using the specified strategy.
 * This is called by the sync engine when pulling remote changes.
 * 
 * @param remoteTodo - The todo from the API
 * @param strategy - Conflict resolution strategy (default: 'last-write-wins')
 * @returns The resolved todo and whether a conflict was detected
 */
export async function mergeRemoteTodo(
  remoteTodo: { id: number; title: string; done: number; updatedAt?: number },
  strategy: ConflictResolutionStrategy = 'last-write-wins'
): Promise<{ resolved: any; conflictDetected: boolean }> {
  // Get local todo if it exists
  const localTodo = await todosRepo.getTodoById(remoteTodo.id)

  if (!localTodo) {
    // New todo from remote - just insert it
    await todosRepo.upsertTodo(remoteTodo)
    return { resolved: remoteTodo, conflictDetected: false }
  }

  // If local todo is unsynced, we have a conflict
  const hasConflict = localTodo.synced === 0

  if (hasConflict) {
    // Resolve conflict using the specified strategy
    const resolution = defaultConflictResolver.resolve<{ id: number; title: string; done: number; updatedAt?: number }>(localTodo, remoteTodo, strategy)

    // If local wins, keep local changes and mark as unsynced (will be pushed later)
    if (resolution.strategy === 'local-wins' && resolution.resolved === localTodo) {
      // Don't update - keep local changes
      return { resolved: localTodo, conflictDetected: true }
    }

    // Otherwise, use resolved version
    const resolved = {
      ...resolution.resolved,
      synced: 1, // Mark as synced since we're accepting remote or resolved version
      updatedAt: resolution.resolved.updatedAt ?? Date.now(),
    }

    await todosRepo.upsertTodo(resolved)
    return { resolved, conflictDetected: resolution.conflictDetected }
  }

  // No conflict - local is already synced, so remote is newer
  // Use conflict resolver to determine which is newer
  const resolution = defaultConflictResolver.resolve<{ id: number; title: string; done: number; synced?: number; deleted?: number; updatedAt?: number }>(localTodo, remoteTodo, strategy)
  const resolved = {
    ...resolution.resolved,
    synced: 1,
    updatedAt: resolution.resolved.updatedAt ?? Date.now(),
  }

  await todosRepo.upsertTodo(resolved)
  return { resolved, conflictDetected: resolution.conflictDetected }
}
