import type { SyncPort, SyncReason } from '../domain/ports/sync.port'
import { getConflictStrategy } from '@/domain/config/data-policies'
import * as syncMetadata from '@/db/sync-metadata/repo'
import { retryWithBackoff, isRetryableError } from './retry-utils'
import { getTableAdapter, type TableSyncAdapter } from './table-sync-adapter'

type SyncEngineDeps = {
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
  tableName: string
  adapter?: TableSyncAdapter
}

/**
 * SyncEngine implements the outbox pattern for one table.
 * 1. Drain outbox: Push local changes (unsynced items) to API; then mark synced locally.
 * 2. Drain deletions: Delete items from API that are marked deleted locally; then permanentDelete locally.
 * 3. Pull remote changes: Fetch from API, merge with local DB (conflict resolution), update store.
 *
 * Adapter contract: deleteItem(id) and batchDelete(ids) perform API deletes only.
 * SyncEngine calls permanentDelete(id) after successful API delete(s).
 */
export class SyncEngine implements SyncPort {
  private running = false
  private logger: Pick<Console, 'log' | 'warn' | 'error'>
  private tableName: string
  private adapter: TableSyncAdapter
  /** Used by stop() to abort in-flight sync at next step boundary */
  private abortController: AbortController | null = null

  constructor(deps: SyncEngineDeps) {
    if (!deps) {
      throw new Error('SyncEngine requires dependencies')
    }
    this.logger = deps.logger ?? console
    this.tableName = deps.tableName
    this.adapter =
      deps.adapter ??
      getTableAdapter(deps.tableName) ??
      (() => {
        throw new Error(`No adapter found for table: ${deps.tableName}`)
      })()
  }

  isRunning(): boolean {
    return this.running
  }

  async start(reason: SyncReason): Promise<void> {
    if (this.running) {
      this.logger.log('[SyncEngine] ⏩ Already running, skipping start', reason)
      return
    }
    this.running = true
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    try {
      await syncMetadata.setSyncState(this.tableName, 'syncing')

      if (signal.aborted) return
      await this.drainOutbox(signal)

      if (signal.aborted) return
      await this.drainDeletions(signal)

      if (signal.aborted) return
      await this.pullRemoteChanges(signal)

      if (signal.aborted) return

      if (signal.aborted) return
      await syncMetadata.markSyncSuccess(this.tableName)
    } catch (err: any) {
      this.logger.error('Sync failed for', this.tableName, err)
      await syncMetadata.markSyncError(this.tableName, err?.message || 'Unknown error')
    } finally {
      this.running = false
      this.abortController = null
    }
  }

  async stop(): Promise<void> {
    if (!this.abortController) return
    this.abortController.abort()
    // running is cleared in start()'s finally when the run exits at next step boundary
  }

  /**
   * Drain outbox: Send unsynced items to API
   * Uses batch operations when possible for better efficiency
   */
  private async drainOutbox(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return
    const unsyncedItems = await this.adapter.getUnsynced()

    if (unsyncedItems.length === 0) {
      return
    }

    this.logger.log(`[6. SYNC] 📤 Draining outbox for ${this.tableName}, found ${unsyncedItems.length} unsynced items`)

    // Try batch operation first (if API supports it)
    if (unsyncedItems.length > 1) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const itemsToBatch = unsyncedItems.map((item: any) => ({
          ...item,
          updatedAt: item.updatedAt ?? now
        }))
        this.logger.log(`[7a. ADAPTER] 🔌 Calling API for batch upsert...`, itemsToBatch.length, 'items')
        const batchResult = await this.adapter.batchUpsert(itemsToBatch)
        this.logger.log(`[7. SYNC] ✅ Batch pushed ${batchResult.length} items, ids:`, batchResult.map((r) => r.id))

        // Mark all as synced
        for (const item of unsyncedItems) {
          await this.adapter.markAsSynced(item.id)
        }

        return // Success - exit early
      } catch (error: any) {
        // If batch fails, fall back to individual operations
        this.logger.warn('Batch operation failed for', this.tableName, 'falling back to individual operations', error)
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
            retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout']
          }
        )
        await this.adapter.markAsSynced(item.id)
        this.logger.log(`[7b. SYNC] 📤 Pushed item from ${this.tableName}: id ${item.id}`)
      } catch (error) {
        // Only log error if it's not retryable (retryable errors are already logged by retryWithBackoff)
        if (!isRetryableError(error)) {
          this.logger.error('Failed to push item from', this.tableName, 'id', item.id, error)
        }
        // Continue with other items even if one fails
      }
    }
  }

  /**
   * Drain deletions: Delete items from API that are marked as deleted locally
   * Uses batch operations when possible for better efficiency
   */
  private async drainDeletions(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return
    const deletedItems = await this.adapter.getDeleted()

    if (deletedItems.length === 0) {
      // this.logger.log(`[SyncEngine] No deleted items to sync for ${this.tableName}`)
      return
    }

    // this.logger.log(`[SyncEngine] Draining ${deletedItems.length} deleted items from ${this.tableName}`)

    // Try batch operation first (if API supports it)
    if (deletedItems.length > 1) {
      try {
        const idsToDelete = deletedItems.map((item: { id: number }) => item.id)
        await this.adapter.batchDelete(idsToDelete)
        // this.logger.log(`[SyncEngine] Batch deleted ${idsToDelete.length} items from ${this.tableName}`)

        // Permanently delete all locally after successful API batch delete
        for (const item of deletedItems) {
          await this.adapter.permanentDelete(item.id)
        }

        return // Success - exit early
      } catch (error: any) {
        // If batch fails, fall back to individual operations
        this.logger.warn('Batch delete failed for', this.tableName, 'falling back to individual operations', error)
      }
    }

    // Fallback: Individual operations (or if only one item)
    for (const item of deletedItems) {
      try {
        await this.adapter.deleteItem(item.id)
        // Permanently delete locally after successful API delete
        await this.adapter.permanentDelete(item.id)
        // this.logger.log(`[SyncEngine] Deleted item from API (${this.tableName}): ${item.id}`)
      } catch (error: any) {
        // If 404, the item doesn't exist in API - safe to delete locally
        if (error?.message?.includes('404') || error?.status === 404) {
          await this.adapter.permanentDelete(item.id)
          // this.logger.log(`[SyncEngine] Item ${item.id} from ${this.tableName} not found in API, deleted locally`)
        } else {
          this.logger.error('Failed to delete item from API', this.tableName, item.id, error)
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
  private async pullRemoteChanges(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return

    try {
      // Get last sync timestamp for incremental sync
      const metadata = await syncMetadata.getSyncMetadata(this.tableName)
      const since = metadata?.lastSyncTimestamp ?? 0

      let apiItems: any[]
      let isIncremental = false

      if (since > 0) {
        // Try incremental sync with retry
        try {
          // this.logger.log(`[SyncEngine] Attempting incremental sync for ${this.tableName} since ${new Date(since * 1000).toISOString()}`)
          apiItems = await retryWithBackoff(async () => this.adapter.fetchSince(since), {
            maxRetries: 2,
            initialDelay: 1000
          })
          isIncremental = true
          // this.logger.log(`[SyncEngine] Incremental sync successful for ${this.tableName}, fetched ${apiItems.length} changes`)
        } catch (error: any) {
          // If incremental sync fails (API might not support it), fall back to full sync
          this.logger.warn('Incremental sync failed for', this.tableName, 'falling back to full sync', error)
          apiItems = await retryWithBackoff(async () => this.adapter.fetchAll(), {
            maxRetries: 3,
            initialDelay: 1000
          })
          isIncremental = false
        }
      } else {
        // First sync - do full sync
        // this.logger.log(`[SyncEngine] First sync for ${this.tableName} - performing full sync`)
        apiItems = await this.adapter.fetchAll()
        isIncremental = false
      }

      const strategy = getConflictStrategy(this.tableName)
      let conflictCount = 0
      let mergeErrors = 0

      // Merge API items into local database with per-table conflict strategy (per-item try/catch for resilience)
      for (const item of apiItems) {
        if (signal?.aborted) return
        try {
          const result = await this.adapter.mergeRemote(item, strategy)
          if (result.conflictDetected) conflictCount++
        } catch (err: any) {
          mergeErrors++
          this.logger.error('mergeRemote failed for', this.tableName, 'item', item?.id, err)
        }
      }

      if (mergeErrors > 0) {
        this.logger.warn(mergeErrors, 'item(s) failed to merge for', this.tableName)
      }

      // Update store with merged data from DB
      await this.adapter.updateStore()

      this.logger.log(
        'Pulled',
        apiItems.length,
        'items from API for',
        this.tableName,
        isIncremental ? '(incremental)' : '(full)',
        conflictCount > 0 ? `resolved ${conflictCount} conflicts` : '',
        mergeErrors > 0 ? `${mergeErrors} merge error(s)` : ''
      )
    } catch (error) {
      this.logger.error('Failed to pull remote changes for', this.tableName, error)
      throw error // Re-throw to let start() handle it
    }
  }
}
