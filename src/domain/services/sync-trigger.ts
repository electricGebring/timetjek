/**
 * Sync Trigger Service
 *
 * Lets the domain layer request an immediate sync when online (e.g. after a mutation).
 * Debounces rapid calls so multiple mutations in a short window result in one sync.
 * "Already running" is handled by SyncManager – this layer only debounces and checks connectivity.
 */

import type { SyncPort, SyncReason } from '../ports/sync.port'

import type { ConnectivityPort } from '../ports/connectivity.port'

import { createLogger } from '@/utils/logger'

const logger = createLogger('SyncTrigger')

const DEBOUNCE_MS = 100

let globalSyncPort: SyncPort | null = null

let globalConnectivity: ConnectivityPort | null = null

let pendingSyncTimeout: ReturnType<typeof setTimeout> | null = null

export function initSyncTrigger(sync: SyncPort, connectivity: ConnectivityPort): void {
  globalSyncPort = sync

  globalConnectivity = connectivity
}

/**
 * Request a sync if online. Non-blocking and debounced.
 * Safe to call from domain after mutations; coordinator still handles connectivity-driven sync.
 */
export function triggerSyncIfOnline(reason: 'manual' | 'mutation' = 'manual'): void {
  if (!globalSyncPort || !globalConnectivity) return

  if (pendingSyncTimeout) {
    clearTimeout(pendingSyncTimeout)

    pendingSyncTimeout = null
  }

  pendingSyncTimeout = setTimeout(() => {
    pendingSyncTimeout = null

    runSyncIfOnline(reason)
  }, DEBOUNCE_MS)
}

async function runSyncIfOnline(reason: 'manual' | 'mutation'): Promise<void> {
  const sync = globalSyncPort

  const connectivity = globalConnectivity

  if (!sync || !connectivity) return

  try {
    const state = await connectivity.getCurrent()

    if (!state.online || sync.isRunning()) return

    sync.start(reason as unknown as SyncReason).catch((err) => {
      logger.warn('Immediate sync failed', err)
    })
  } catch (error) {
    logger.warn('Failed to check connectivity', error)
  }
}
