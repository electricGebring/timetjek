import type { SyncPort, SyncReason } from '../domain/ports/sync.port'

import type { Entry } from '@/views/staffRegister/types'

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

  // Store timings for debug
  public lastSyncTimings: Record<string, number> = {}

  async start(reason: SyncReason): Promise<void> {

    if (this.running) {
      this.logger.log('[SyncEngine] ⏩ Already running, skipping start', reason);

      return;
    }

    this.running = true;

    this.abortController = new AbortController();

    const signal = this.abortController.signal;

    const timings: Record<string, number> = {};

    try {

      const t0 = performance.now();

      await syncMetadata.setSyncState(this.tableName, 'syncing');

      timings.setSyncState = performance.now() - t0;


      if (signal.aborted) {
        this.lastSyncTimings = timings;

        return;
      }

      const t1 = performance.now();

      await this.drainOutbox(signal);

      timings.drainOutbox = performance.now() - t1;

      if (signal.aborted) {
        this.lastSyncTimings = timings;

        return;
      }

      const t2 = performance.now();

      await this.drainDeletions(signal);

      timings.drainDeletions = performance.now() - t2;

      if (signal.aborted) {
        this.lastSyncTimings = timings;

        return;
      }

      const t3 = performance.now();

      await this.pullRemoteChanges(signal);

      timings.pullRemoteChanges = performance.now() - t3;

      if (signal.aborted) {
        this.lastSyncTimings = timings;

        return;
      }

      const t4 = performance.now();

      await syncMetadata.markSyncSuccess(this.tableName);

      timings.markSyncSuccess = performance.now() - t4;

    }
    catch (err: unknown) {
      this.logger.error('Sync failed for', this.tableName, err);

      timings.error = 1;

      await syncMetadata.markSyncError(
        this.tableName,
        (err as Error)?.message || 'Unknown error'
      );
    }
    finally {
      this.lastSyncTimings = timings;

      this.running = false;

      this.abortController = null;
    }
  }

  async stop(): Promise<void> {
    if (!this.abortController) {
      return;
    }

    this.abortController.abort();
    // running is cleared in start()'s finally when the run exits at next step boundary
  }

  /**
   * Drain outbox: Send unsynced items to API
   * Uses batch operations when possible for better efficiency
   */
  private async drainOutbox(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return;
    }

    const unsyncedItems = await this.adapter.getUnsynced() as Entry[];

    if (unsyncedItems.length === 0) {
      return;
    }

    this.logger.log(`[6. SYNC] 📤 Draining outbox for ${this.tableName}, found ${unsyncedItems.length} unsynced items`)

    // Try batch operation first (if API supports it)
    if (unsyncedItems.length > 1) {
      try {
        const now = Math.floor(Date.now() / 1000)

        const itemsToBatch = unsyncedItems.map((item) => ({
          ...item,
          updatedAt: item.updatedAt ?? now
        }))

        this.logger.log(`[7a. SYNC] 🔌 Calling API adapter.batchUpsert for ${itemsToBatch.length} items`)

        this.logger.log('[DEBUG] sync-engine: anropar adapter.batchUpsert', itemsToBatch)

        const batchResult = await this.adapter.batchUpsert(itemsToBatch)

        this.logger.log(
          `[7b. SYNC] ✅ Batch pushed ${batchResult.length} items, ids:`,
          batchResult.map((r) => (r as Entry).id)
        )

        // Mark all as synced
        for (const item of unsyncedItems) {
          await this.adapter.markAsSynced(item.id)
        }

        return // Success - exit early
      }
      catch (error: unknown) {
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

        this.logger.log(`[7c. SYNC] 📤 Pushed item from ${this.tableName}: id ${item.id}`)
      }
      catch (error) {
        // Only log error if it's not retryable (retryable errors are already logged by retryWithBackoff)
        if (!isRetryableError(error)) {
          this.logger.error('Failed to push item from', this.tableName, 'id', item.id, error)
        }
      }
    }
  }

  /**
   * Drain deletions: Delete items from API that are marked as deleted locally
   * Uses batch operations when possible for better efficiency
   */
  private async drainDeletions(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return;
    }

    const deletedItems = await this.adapter.getDeleted();

    if (deletedItems.length === 0) {
      return;
    }

    // Try batch operation first (if API supports it)
    if (deletedItems.length > 1) {
      try {
        const idsToDelete = (deletedItems as { id: number }[]).map((item) => item.id)

        await this.adapter.batchDelete(idsToDelete)
        // this.logger.log(`[SyncEngine] Batch deleted ${idsToDelete.length} items from ${this.tableName}`)

        // Permanently delete all locally after successful API batch delete
        for (const item of deletedItems) {
          await this.adapter.permanentDelete((item as { id: number }).id)
        }

        return // Success - exit early
      }
      catch (error: unknown) {
        // If batch fails, fall back to individual operations
        this.logger.warn('Batch delete failed for', this.tableName, 'falling back to individual operations', error)
      }
    }

    // Fallback: Individual operations (or if only one item)
    for (const item of deletedItems) {
      try {
        const typedItem = item as { id: number }

        await this.adapter.deleteItem(typedItem.id)

        // Permanently delete locally after successful API delete
        await this.adapter.permanentDelete(typedItem.id)
        // this.logger.log(`[SyncEngine] Deleted item from API (${this.tableName}): ${item.id}`)
      }
      catch (error: unknown) {
        // If 404, the item doesn't exist in API - safe to delete locally
        const hasMessage = (e: unknown): e is { message: string } =>
          typeof e === 'object' && e !== null && 'message' in e &&
          typeof (e as { message: unknown }).message === 'string';

        const hasStatus = (e: unknown): e is { status: number } =>
          typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number';

        if ((hasMessage(error) && error.message.includes('404')) || (hasStatus(error) && error.status === 404)) {
          await this.adapter.permanentDelete((item as { id: number }).id)
          // this.logger.log(`[SyncEngine] Item ${item.id} from ${this.tableName} not found in API, 
          // deleted locally`)
        }
        else {
          this.logger.error(
            'Failed to delete item from API',
            this.tableName,
            (item as { id: number }).id,
            error
          )
          // Continue with other deletions even if one fails
        }
      }
    }
  }

  /**
   * Fetch items from API: incremental när vi har lastSyncTimestamp, annars full; faller tillbaka till full vid fel.
   */
  private async fetchRemoteItems(): Promise<{ apiItems: Entry[]; isIncremental: boolean }> {

    const metadata = await syncMetadata.getSyncMetadata(this.tableName);

    const since = metadata?.lastSyncTimestamp ?? 0;

    if (since === 0) {
      const apiItems = await this.adapter.fetchAll() as Entry[];

      return { apiItems, isIncremental: false };
    }

    try {
      const apiItems = await retryWithBackoff(async () => this.adapter.fetchSince(since), {
        maxRetries: 2,
        initialDelay: 1000
      }) as Entry[]

      return { apiItems, isIncremental: true }
    }
    catch (error: unknown) {
      this.logger.warn('Incremental sync failed for', this.tableName, 'falling back to full sync', error)

      const apiItems = await retryWithBackoff(async () => this.adapter.fetchAll(), {
        maxRetries: 3,
        initialDelay: 1000
      }) as Entry[]

      return { apiItems, isIncremental: false }
    }
  }

  /**
   * Pull remote changes: Fetch from API, resolve in memory (no DB write).
   * Combine resolved API items with unsynced local entries and update store only.
   * DB is written only when pushing (drainOutbox: unsynced → API → save result).
   */
  private async pullRemoteChanges(signal?: AbortSignal): Promise<void> {
    this.logger.log('[6. SYNC] 📥 Pulling remote changes for', this.tableName);

    if (signal?.aborted) {
      return;
    }

    try {
      const { apiItems, isIncremental } = await this.fetchRemoteItems();

      if (signal?.aborted) {
        return;
      }

      // Om API är offline, fetch misslyckas, ELLER apiItems är tom array, ladda från DB istället
      if (!apiItems || !Array.isArray(apiItems) || apiItems.length === 0) {
        this.logger.warn('[SYNC] API offline, fetch misslyckades eller tom lista – laddar entries från lokal DB');

        await this.adapter.updateStore();

        return;
      }

      const { conflictCount, mergeErrors, resolvedItems } = await this.mergeItemsInMemory(apiItems, signal);

      if (signal?.aborted) {
        return;
      }

      if (mergeErrors > 0) {
        this.logger.warn(mergeErrors, 'item(s) failed to merge for', this.tableName);
      }

      const unsyncedItems = await this.adapter.getUnsynced();

      const byId = new Map<number, Entry>();

      for (const item of resolvedItems as Entry[]) {
        if ((item as Entry)?.id !== null) {
          byId.set((item as Entry).id, item as Entry);
        }
      }

      for (const item of unsyncedItems as Entry[]) {
        if ((item as Entry)?.id !== null) {
          byId.set((item as Entry).id, item as Entry);
        }
      }

      const combined = Array.from(byId.values());

      await this.adapter.updateStore(combined);

      this.logPullResult(apiItems.length, isIncremental, conflictCount, mergeErrors);
    }
    catch (error) {
      this.logger.error('Failed to pull remote changes for', this.tableName, error);

      // If sync with API fails, restore store from local DB
      await this.adapter.updateStore();
    }

  }

  /** Resolve each API item with local in memory (no DB write); returns resolved list for store update. */
  private async mergeItemsInMemory(
    apiItems: Entry[],
    signal?: AbortSignal
  ): Promise<{ conflictCount: number; mergeErrors: number; resolvedItems: Entry[] }> {
    const strategy = getConflictStrategy(this.tableName)

    let conflictCount = 0

    let mergeErrors = 0

    const resolvedItems: Entry[] = []

    for (const item of apiItems) {
      if (signal?.aborted) {
        break;
      }

      try {
        const result = await this.adapter.mergeRemote(item, strategy)

        if (result.conflictDetected) conflictCount++

        if (result.resolved && typeof result.resolved === 'object' && 'id' in result.resolved) {
          resolvedItems.push(result.resolved as Entry)
        }
      }
      catch (err: unknown) {
        mergeErrors++;

        this.logger.error(
          'mergeRemote failed for',
          this.tableName,
          'item',
          item && typeof item === 'object' && 'id' in item ? (item as Entry).id : undefined,
          err
        );
      }
    }

    return { conflictCount, mergeErrors, resolvedItems };
  }

  private logPullResult(itemCount: number, isIncremental: boolean, conflictCount: number, mergeErrors: number): void {
    const parts = [
      'Pulled',
      itemCount,
      'items from API for',
      this.tableName,
      isIncremental ? '(incremental)' : '(full)'
    ];

    if (conflictCount > 0) {
      parts.push(`resolved ${conflictCount} conflicts`);
    }

    if (mergeErrors > 0) {
      parts.push(`${mergeErrors} merge error(s)`);
    }

    this.logger.log(...parts);
  }
}
