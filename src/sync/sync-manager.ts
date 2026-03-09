/**
 * Sync Manager - orchestrates sync for multiple tables based on their policies
 */

import type { SyncReason } from '../domain/ports/sync.port'

import { createLogger } from '@/utils/logger'

import { getSyncUnitsForSync, getAggregationPoliciesForSync, getDataPolicy } from '../domain/config/data-policies'

import { SyncEngine } from './sync-engine'

import { getTableAdapter } from './table-sync-adapter'

type SyncManagerDeps = {
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
}

/**
 * Manages sync for multiple tables based on their data policies
 * Only syncs tables that are configured for offline-first mode.
 * At most one syncAll() runs at a time (guard prevents overlapping runs).
 */
export class SyncManager {
  private syncEngines: Map<string, SyncEngine> = new Map()
  private logger: Pick<Console, 'log' | 'warn' | 'error'>
  private syncInProgress = false

  constructor(deps: SyncManagerDeps = {}) {
    this.logger = deps.logger ?? console
  }

  /**
   * Get or create sync engine for a sync unit (aggregation or table)
   * Public for debug/timing
   */
  public getSyncEngine(syncKey: string): SyncEngine | null {
    const isAggregation = getAggregationPoliciesForSync().some((ap) => ap.aggregationName === syncKey)
    const isTable = getDataPolicy(syncKey) !== undefined

    if (!isAggregation && !isTable) {
      return null
    }

    if (!this.syncEngines.has(syncKey)) {
      const adapter = getTableAdapter(syncKey)

      if (!adapter) {
        return null
      }

      this.syncEngines.set(
        syncKey,
        new SyncEngine({
          logger: createLogger('SyncEngine'),
          tableName: syncKey,
          adapter
        })
      )
    }

    return this.syncEngines.get(syncKey)!
  }

  /**
   * Sync all tables that should be synced.
   * Only one syncAll() runs at a time; overlapping calls return early.
   */
  async syncAll(reason: SyncReason): Promise<void> {
    if (this.syncInProgress) {
      this.logger.log('[SyncManager] ⏳ Sync already in progress, skipping')

      return
    }

    this.syncInProgress = true

    try {
      const syncUnits = getSyncUnitsForSync()

      const results = await Promise.allSettled(
        syncUnits.map(async (syncKey) => {
          const engine = this.getSyncEngine(syncKey)

          if (!engine) return

          try {
            await engine.start(reason)
          } catch (error) {
            this.logger.error(`[SyncManager] Failed to sync ${syncKey}:`, error)

            throw error
          }
        })
      )

      const failed = results.filter((r) => r.status === 'rejected')

      if (failed.length > 0) {
        this.logger.warn(`[SyncManager] ${failed.length} tables failed to sync`)
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-completed'))
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Sync a specific table or aggregation
   */
  async syncTable(syncKey: string, reason: SyncReason): Promise<void> {
    const syncUnits = getSyncUnitsForSync()

    if (!syncUnits.includes(syncKey)) {
      this.logger.warn(`[SyncManager] Sync unit ${syncKey} is not configured for sync`)

      return
    }

    const engine = this.getSyncEngine(syncKey)

    if (!engine) {
      throw new Error(`No sync engine available for ${syncKey}`)
    }

    await engine.start(reason)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-completed'))
    }
  }

  /**
   * Stop all sync engines
   */
  async stopAll(): Promise<void> {
    await Promise.all(Array.from(this.syncEngines.values()).map((engine) => engine.stop()))
  }

  /**
   * Stop sync for a specific table
   */
  async stopTable(tableName: string): Promise<void> {
    const engine = this.syncEngines.get(tableName)

    if (engine) {
      await engine.stop()
    }
  }

  /**
   * Check if any sync is running
   */
  isAnyRunning(): boolean {
    return Array.from(this.syncEngines.values()).some((engine) => engine.isRunning())
  }

  /**
   * Check if a specific table is syncing
   */
  isTableRunning(tableName: string): boolean {
    const engine = this.syncEngines.get(tableName)

    return engine?.isRunning() ?? false
  }
}
