import type { SyncPort, SyncReason } from '../domain/ports/sync.port'
import * as syncMetadata from '@/db/sync-metadata/repo'
import { retryWithBackoff, isRetryableError } from './retry-utils'
import { getTableAdapter, type TableSyncAdapter } from './table-sync-adapter'

type SyncEngineDeps = {
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
  tableName: string
  adapter?: TableSyncAdapter
}

/**
 * SyncEngine implements the outbox pattern:
 * 1. Drain outbox: Push local changes (unsynced todos) to API
 * 2. Drain deletions: Delete todos from API that are marked as deleted locally
 * 3. Pull remote changes: Fetch from API and merge with local database
 */
export class SyncEngine implements SyncPort {
  private running = false
  private logger: Pick<Console, 'log' | 'warn' | 'error'>
  private tableName: string
  private adapter: TableSyncAdapter

  constructor(deps: SyncEngineDeps) {
    if (!deps) {
      throw new Error('SyncEngine requires dependencies')
    }
    this.logger = deps.logger ?? console
    this.tableName = deps.tableName
    this.adapter = deps.adapter ?? getTableAdapter(deps.tableName) ?? (() => {
      throw new Error(`No adapter found for table: ${deps.tableName}`)
    })()
  }

  isRunning(): boolean {
    return this.running
  }

  async start(reason: SyncReason): Promise<void> {
    if (this.running) {
      this.logger.log(`[SyncEngine] Already running, skipping start (${reason})`)
      return
    }
    this.running = true

    this.logger.log(`[SyncEngine] start (${reason}) for table: ${this.tableName}`)

    try {
      // Set sync state to syncing
      await syncMetadata.setSyncState(this.tableName, 'syncing')

      // 1. Drain outbox: Push local todos to API
      await this.drainOutbox()

      // 2. Drain deletions: Remove deleted todos from API
      await this.drainDeletions()

      // 3. Pull remote changes: Fetch from API and merge with local database
      await this.pullRemoteChanges()

      // Mark sync as successful
      await syncMetadata.markSyncSuccess(this.tableName)
      this.logger.log(`[SyncEngine] Sync completed successfully for ${this.tableName}`)
    } catch (err: any) {
      this.logger.error(`[SyncEngine] Sync failed for ${this.tableName}`, err)
      // Mark sync as failed
      await syncMetadata.markSyncError(this.tableName, err?.message || 'Unknown error')
      // On error, we still mark as not running to allow retry
    } finally {
      this.running = false
    }
  }

  async stop(): Promise<void> {
    if (!this.running) return
    this.logger.log('[SyncEngine] stop')
    this.running = false
  }

  /**
   * Drain outbox: Send unsynced items to API
   * Uses batch operations when possible for better efficiency
   */
  private async drainOutbox(): Promise<void> {
    const unsyncedItems = await this.adapter.getUnsynced()

    if (unsyncedItems.length === 0) {
      this.logger.log(`[SyncEngine] No unsynced items to push for ${this.tableName}`)
      return
    }

    this.logger.log(`[SyncEngine] Draining ${unsyncedItems.length} unsynced items from ${this.tableName}`)

    // Try batch operation first (if API supports it)
    if (unsyncedItems.length > 1) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const itemsToBatch = unsyncedItems.map((item: any) => ({
          ...item,
          updatedAt: item.updatedAt ?? now,
        }))

        const batchResult = await this.adapter.batchUpsert(itemsToBatch)
        this.logger.log(`[SyncEngine] Batch pushed ${batchResult.length} items from ${this.tableName}`)

        // Mark all as synced
        for (const item of unsyncedItems) {
          await this.adapter.markAsSynced(item.id)
        }

        return // Success - exit early
      } catch (error: any) {
        // If batch fails, fall back to individual operations
        this.logger.warn(`[SyncEngine] Batch operation failed for ${this.tableName}, falling back to individual operations`, error)
      }
    }

    // Fallback: Individual operations (or if only one item)
    for (const item of unsyncedItems) {
      try {
        const now = Math.floor(Date.now() / 1000)
        // Retry with exponential backoff for network errors
        await retryWithBackoff(
          async () => {
            await this.adapter.createItem({ ...item, updatedAt: now })
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout'],
          }
        )
        await this.adapter.markAsSynced(item.id)
        this.logger.log(`[SyncEngine] Pushed item from ${this.tableName}: id ${item.id}`)
      } catch (error) {
        // Only log error if it's not retryable (retryable errors are already logged by retryWithBackoff)
        if (!isRetryableError(error)) {
          this.logger.error(`[SyncEngine] Failed to push item from ${this.tableName}: id ${item.id}`, error)
        }
        // Continue with other items even if one fails
      }
    }
  }

  /**
   * Drain deletions: Delete items from API that are marked as deleted locally
   * Uses batch operations when possible for better efficiency
   */
  private async drainDeletions(): Promise<void> {
    const deletedItems = await this.adapter.getDeleted()

    if (deletedItems.length === 0) {
      this.logger.log(`[SyncEngine] No deleted items to sync for ${this.tableName}`)
      return
    }

    this.logger.log(`[SyncEngine] Draining ${deletedItems.length} deleted items from ${this.tableName}`)

    // Try batch operation first (if API supports it)
    if (deletedItems.length > 1) {
      try {
        const idsToDelete = deletedItems.map((item: { id: number }) => item.id)
        await this.adapter.batchDelete(idsToDelete)
        this.logger.log(`[SyncEngine] Batch deleted ${idsToDelete.length} items from ${this.tableName}`)

        // Permanently delete all after successful batch delete
        for (const item of deletedItems) {
          await this.adapter.deleteItem(item.id)
          //await this.adapter.permanentDelete(item.id)
        }

        return // Success - exit early
      } catch (error: any) {
        // If batch fails, fall back to individual operations
        this.logger.warn(`[SyncEngine] Batch delete failed for ${this.tableName}, falling back to individual operations`, error)
      }
    }

    // Fallback: Individual operations (or if only one item)
    for (const item of deletedItems) {
      try {
        await this.adapter.deleteItem(item.id)
        // Permanently delete after successful API delete
        //await this.adapter.permanentDelete(item.id)
        this.logger.log(`[SyncEngine] Deleted item from API (${this.tableName}): ${item.id}`)
      } catch (error: any) {
        // If 404, the item doesn't exist in API - safe to delete locally
        if (error?.message?.includes('404') || error?.status === 404) {
          await this.adapter.permanentDelete(item.id)
          this.logger.log(`[SyncEngine] Item ${item.id} from ${this.tableName} not found in API, deleted locally`)
        } else {
          this.logger.error(`[SyncEngine] Failed to delete item from API (${this.tableName}): ${item.id}`, error)
          // Continue with other deletions even if one fails
        }
      }
    }
  }

  /**
   * Pull remote changes: Fetch from API and merge with local database
   * Uses incremental sync when possible - only fetches changes since last sync
   * Uses conflict resolution to handle concurrent edits
   */
  private async pullRemoteChanges(): Promise<void> {
    this.logger.log(`[SyncEngine] Pulling remote changes for ${this.tableName}`)

    try {
      // Get last sync timestamp for incremental sync
      const metadata = await syncMetadata.getSyncMetadata(this.tableName)
      const since = metadata?.lastSyncTimestamp ?? 0

      let apiItems: any[]
      let isIncremental = false

      if (since > 0) {
        // Try incremental sync with retry
        try {
          this.logger.log(`[SyncEngine] Attempting incremental sync for ${this.tableName} since ${new Date(since * 1000).toISOString()}`)
          apiItems = await retryWithBackoff(
            async () => this.adapter.fetchSince(since),
            {
              maxRetries: 2,
              initialDelay: 1000,
            }
          )
          isIncremental = true
          this.logger.log(`[SyncEngine] Incremental sync successful for ${this.tableName}, fetched ${apiItems.length} changes`)
        } catch (error: any) {
          // If incremental sync fails (API might not support it), fall back to full sync
          this.logger.warn(`[SyncEngine] Incremental sync failed for ${this.tableName}, falling back to full sync`, error)
          apiItems = await retryWithBackoff(
            async () => this.adapter.fetchAll(),
            {
              maxRetries: 3,
              initialDelay: 1000,
            }
          )
          isIncremental = false
        }
      } else {
        // First sync - do full sync
        this.logger.log(`[SyncEngine] First sync for ${this.tableName} - performing full sync`)
        apiItems = await this.adapter.fetchAll()
        isIncremental = false
      }

      let conflictCount = 0

      // Merge API items into local database with conflict resolution
      for (const item of apiItems) {
        const result = await this.adapter.mergeRemote(item, 'last-write-wins')
        if (result.conflictDetected) {
          conflictCount++
          this.logger.log(`[SyncEngine] Resolved conflict for ${this.tableName} item ${item.id}`)
        }
      }

      // Update store with merged data from DB
      await this.adapter.updateStore()

      this.logger.log(
        `[SyncEngine] Pulled ${apiItems.length} items from API for ${this.tableName}${isIncremental ? ' (incremental)' : ' (full)'}${conflictCount > 0 ? `, resolved ${conflictCount} conflicts` : ''}`
      )
    } catch (error) {
      this.logger.error(`[SyncEngine] Failed to pull remote changes for ${this.tableName}`, error)
      throw error // Re-throw to let start() handle it
    }
  }
}
