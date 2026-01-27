/**
 * Sync Manager - orchestrates sync for multiple tables based on their policies
 */

import type { SyncReason } from '../domain/ports/sync.port'
import { getPoliciesForSync, shouldSyncTable } from '../domain/config/data-policies'
import { SyncEngine } from './sync-engine'
import { getTableAdapter } from './table-sync-adapter'

type SyncManagerDeps = {
  logger?: Pick<Console, 'log' | 'warn' | 'error'>
}

/**
 * Manages sync for multiple tables based on their data policies
 * Only syncs tables that are configured for offline-first mode
 */
export class SyncManager {
  private syncEngines: Map<string, SyncEngine> = new Map()
  private logger: Pick<Console, 'log' | 'warn' | 'error'>

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
        this.logger.error(`[SyncManager] No adapter found for table: ${tableName}`)
        return null
      }

      this.syncEngines.set(
        tableName,
        new SyncEngine({
          logger: this.logger,
          tableName,
          adapter,
        })
      )
    }

    return this.syncEngines.get(tableName)!
  }

  /**
   * Sync all tables that should be synced
   */
  async syncAll(reason: SyncReason): Promise<void> {
    // Extra skydd: kör aldrig sync om offline (web)
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.logger.warn('[SyncManager] Avbryter sync: navigator.onLine är false (offline-läge)')
      return
    }
    const policies = getPoliciesForSync()

    const results = await Promise.allSettled(
      policies.map(async (policy) => {
        const engine = this.getSyncEngine(policy.tableName)
        if (!engine) {
          this.logger.warn(`[SyncManager] No sync engine for ${policy.tableName}`)
          return
        }

        try {
          await engine.start(reason)
          // this.logger.log(`[SyncManager] Synced ${policy.tableName}`)
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
