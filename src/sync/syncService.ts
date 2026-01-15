/**
 * Sync service for network monitoring
 */

import { Network } from '@capacitor/network'
import * as domain from '@/domain/domain'
import * as todosApi from '@/api/todos'
import * as todosRepo from '@/db/todos/repo'

export class SyncService {
  /**
   * Checks if device is online
   */
  async isOnline(): Promise<boolean> {
    const status = await Network.getStatus()
    return status.connected
  }

  /**
   * Initialize network listener
   */
  async init() {
    // Register callback for mutations
    domain.onMutation(() => {
      this.isOnline().then(online => {
        if (online) {
          this.syncAll()
        }
      })
    })

    // Check if online at startup and sync
    const isOnline = await this.isOnline()
    if (isOnline) {
      await this.syncAll()
    }

    Network.addListener('networkStatusChange', async (status) => {
      console.log('Network changed:', status.connected)
      
      if (status.connected) {
        await this.syncAll()
      }
    })
  }

  /**
   * Full sync: push local changes to API, delete from API, then pull from API
   */
  async syncAll() {
    try {
      // 1. Push: Send local todos to API
      await this.pushToApi()
      
      // 2. Delete: Remove deleted todos from API
      await this.deleteFromApi()
      
      // 3. Pull: Fetch from API and update store
      await this.pullFromApi()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  /**
   * Push local todos to API
   */
  async pushToApi() {
    const unsyncedTodos = await todosRepo.getUnsyncedTodos()
    
    // For each local todo, create in API if it doesn't exist
    for (const todo of unsyncedTodos) {
      try {
        await todosApi.createTodo(todo.title)
        await todosRepo.markAsSynced(todo.id)
      } catch (error) {
        console.error('Failed to push todo:', todo.title, error)
      }
    }
  }

  /**
   * Delete todos from API that are marked as deleted locally
   */
  async deleteFromApi() {
    const deletedTodos = await todosRepo.getDeletedTodos()
    
    for (const todo of deletedTodos) {
      try {
        await todosApi.deleteTodo(todo.id)
        // Permanently delete after successful API delete
        await todosRepo.permanentDelete(todo.id)
      } catch (error: any) {
        // If 404, the todo doesn't exist in API - safe to delete locally
        if (error?.message?.includes('404') || error?.status === 404) {
          await todosRepo.permanentDelete(todo.id)
        } else {
          console.error('Failed to delete todo from API:', todo.id, error)
        }
      }
    }
  }

  /**
   * Pull from API and merge with local database
   */
  async pullFromApi() {
    const apiTodos = await todosApi.fetchTodos()
    
    // Merge API todos into local database
    for (const todo of apiTodos) {
      await todosRepo.upsertTodo(todo)
    }
    
    // Update store with merged data from DB
    await domain.updateStoreFromDb()
  }
}

const syncService = new SyncService()

export { syncService }