/**
 * Sync Trigger Service
 * 
 * Provides a way for domain layer to trigger immediate sync when online.
 * This is optional - coordinator still handles connectivity-based sync.
 * 
 * For always-online apps, this enables immediate sync on mutations.
 */

import type { SyncPort, SyncReason } from '../ports/sync.port'
import type { ConnectivityPort } from '../ports/connectivity.port'

let globalSyncPort: SyncPort | null = null
let globalConnectivity: ConnectivityPort | null = null
let pendingSyncTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Initialize sync trigger service
 * Called during app bootstrap
 */
export function initSyncTrigger(sync: SyncPort, connectivity: ConnectivityPort): void {
  globalSyncPort = sync
  globalConnectivity = connectivity
}

/**
 * Trigger immediate sync if online (fire and forget)
 * Safe to call from domain layer - won't block
 * 
 * Debounced to allow batch operations to complete before syncing
 * 
 * @param reason - Reason for sync (default: 'manual')
 * @returns Promise that resolves when sync check completes
 */
export async function triggerSyncIfOnline(reason: 'manual' | 'mutation' = 'manual'): Promise<void> {
  if (!globalSyncPort || !globalConnectivity) {
    // Not initialized - skip
    return
  }

  // Clear any pending sync timeout
  if (pendingSyncTimeout) {
    clearTimeout(pendingSyncTimeout)
  }

  // Debounce sync by 100ms to allow batch operations to complete
  pendingSyncTimeout = setTimeout(async () => {
    try {
      const state = await globalConnectivity.getCurrent()
      if (state.online && !globalSyncPort.isRunning()) {
        // Fire and forget - don't await (non-blocking)
        globalSyncPort.start(reason as unknown as SyncReason).catch((err) => {
          console.warn('[SyncTrigger] Immediate sync failed:', err)
          // Sync will still happen via coordinator/periodic sync
        })
      }
    } catch (error) {
      // Silently fail - coordinator will handle sync
      console.warn('[SyncTrigger] Failed to check connectivity:', error)
    }
  }, 100) // Wait 100ms for batch operations to complete
}