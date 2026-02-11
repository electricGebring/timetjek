/**
 * Sync Manager - orchestrates sync for multiple tables based on their policies
 */

import type { SyncReason } from '../domain/ports/sync.port'
import { createLogger } from '@/utils/logger'
import { getPoliciesForSync, shouldSyncTable } from '../domain/config/data-policies'
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
  /** Prevents overlapping syncAll() runs; overlapping triggers become no-ops */
  private syncInProgress = false

  constructor(deps: SyncManagerDeps = {}) {
    this.logger = deps.logger ?? console
  }

  /**
   * Get or create sync engine for a table
   */
  private getSyncEngine(tableName: string): SyncEngine | null {
    if (!shouldSyncTable(tableName)) {
      return null
    }

    if (!this.syncEngines.has(tableName)) {
      const adapter = getTableAdapter(tableName)
      if (!adapter) {
        // NOTE: Missing adapter means this table is intentionally not synced.
        // this.logger.error(`[SyncManager] No adapter found for table: ${tableName}`)
        return null
      }

      this.syncEngines.set(
        tableName,
        new SyncEngine({
          logger: createLogger('SyncEngine'),
          tableName,
          adapter,
        })
      )
    }

    return this.syncEngines.get(tableName)!
  }

  /**
   * Sync all tables that should be synced.
   * Only one syncAll() runs at a time; overlapping calls return early.
   */
  async syncAll(reason: SyncReason): Promise<void> {
    if (this.syncInProgress) {
      this.logger.log('[SyncManager] Sync already in progress, skipping')
      return
    }
    // Extra safety: never run sync when offline (web)
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.logger.warn('[SyncManager] Aborting sync: navigator.onLine is false (offline mode)')
      return
    }

    this.syncInProgress = true
    try {
      const policies = getPoliciesForSync()

      const results = await Promise.allSettled(
        policies.map(async (policy) => {
          const engine = this.getSyncEngine(policy.tableName)
          if (!engine) return

          try {
            await engine.start(reason)
          } catch (error) {
            this.logger.error(`[SyncManager] Failed to sync ${policy.tableName}:`, error)
            throw error
          }
        })
      )

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        this.logger.warn(`[SyncManager] ${failed.length} tables failed to sync`)
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Sync a specific table
   */
  async syncTable(tableName: string, reason: SyncReason): Promise<void> {
    if (!shouldSyncTable(tableName)) {
      this.logger.warn(`[SyncManager] Table ${tableName} is not configured for sync`)
      return
    }

    const engine = this.getSyncEngine(tableName)
    if (!engine) {
      throw new Error(`No sync engine available for ${tableName}`)
    }

    await engine.start(reason)
  }

  /**
   * Stop all sync engines
   */
  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.syncEngines.values()).map((engine) => engine.stop())
    )
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
