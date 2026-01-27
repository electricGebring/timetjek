/**
 * Domain logic for todos (business logic, validation, sync, etc)
 */
import * as todosRepo from '@/db/todos/repo'
import { defaultConflictResolver, type ConflictResolutionStrategy } from '@/sync/conflict-resolver'
import { triggerSyncIfOnline } from '../services/sync-trigger'

export async function getAll() {
  return await todosRepo.getTodos()
}

export async function updateStoreFromDb() {
  const allTodos = await getAll()
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(allTodos)
}

export async function create(title: string) {
  if (!title || title.trim().length === 0) {
    throw new Error('Title cannot be empty')
  }
  if (title.length > 200) {
    throw new Error('Title is too long (max 200 characters)')
  }
  await todosRepo.addTodo(title.trim())
  const localTodos = await getAll()
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(localTodos)
  await triggerSyncIfOnline('mutation')
}

export async function deleteTodo(id: number) {
  await todosRepo.deleteTodo(id)
  const localTodos = await getAll()
  const { useTodoStore } = await import('@/stores/todo/store')
  const store = useTodoStore()
  store.updateTodos(localTodos)
  await triggerSyncIfOnline('mutation')
}

export async function mergeRemoteTodo(
  remoteTodo: { id: number; title: string; done: number; updatedAt?: number },
  strategy: ConflictResolutionStrategy = 'last-write-wins'
): Promise<{ resolved: any; conflictDetected: boolean }> {
  const localTodo = await todosRepo.getTodoById(remoteTodo.id)
  if (!localTodo) {
    await todosRepo.upsertTodo(remoteTodo)
    return { resolved: remoteTodo, conflictDetected: false }
  }
  const hasConflict = localTodo.synced === 0
  if (hasConflict) {
    const resolution = defaultConflictResolver.resolve<{ id: number; title: string; done: number; updatedAt?: number }>(localTodo, remoteTodo, strategy)
    if (resolution.strategy === 'local-wins' && resolution.resolved === localTodo) {
      return { resolved: localTodo, conflictDetected: true }
    }
    const resolved = {
      ...resolution.resolved,
      synced: 1,
      updatedAt: resolution.resolved.updatedAt ?? Date.now(),
    }
    await todosRepo.upsertTodo(resolved)
    return { resolved, conflictDetected: resolution.conflictDetected }
  }
  const resolution = defaultConflictResolver.resolve<{ id: number; title: string; done: number; synced?: number; deleted?: number; updatedAt?: number }>(localTodo, remoteTodo, strategy)
  const resolved = {
    ...resolution.resolved,
    synced: 1,
    updatedAt: resolution.resolved.updatedAt ?? Date.now(),
  }
  await todosRepo.upsertTodo(resolved)
  return { resolved, conflictDetected: resolution.conflictDetected }
}
