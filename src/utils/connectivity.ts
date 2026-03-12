/**
 * Browser connectivity helpers. Use for sync/API code that should not run when offline.
 * SSR-safe: no window/navigator access when those are undefined.
 */

import type { ConnectivityPort, ConnectivityState, Unsubscribe } from '@/domain/ports/connectivity.port'

import type { Logger } from './logger'

let currentConnectivityState: ConnectivityState | null = null

function setCurrentConnectivityState(state: ConnectivityState): void {
  currentConnectivityState = state
}

/**
 * Bind the app-wide connectivity source used by sync helpers.
 * Returns an unsubscribe function for completeness; app bootstrap keeps it for app lifetime.
 */
export async function bindConnectivitySource(connectivity: ConnectivityPort): Promise<Unsubscribe> {
  setCurrentConnectivityState(await connectivity.getCurrent())

  return connectivity.subscribe((state) => {
    setCurrentConnectivityState(state)
  })
}

/**
 * True when running in a browser and navigator reports offline.
 */
export function isBrowserOffline(): boolean {
  if (currentConnectivityState) return currentConnectivityState.online === false

  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  return navigator.onLine === false
}

/**
 * If offline: optionally logs a warning and throws. Use at the start of operations that must not run offline.
 * Logger is optional so adapters can stay logging-agnostic; the implementation layer (e.g. SyncEngine) logs.
 */
export function assertOnline(operation: string, logger?: Logger): void {
  if (isBrowserOffline()) {
    logger?.warn(`${operation} blocked: offline mode`)

    throw new Error(`Offline: cannot ${operation}`)
  }
}

/**
 * If offline: optionally logs a warning and returns true (caller should return). Returns false when online.
 * Logger is optional so adapters can stay logging-agnostic.
 * Use as: if (whenOffline('batchDelete')) return
 */
export function whenOffline(operation: string, logger?: Logger): boolean {
  if (isBrowserOffline()) {
    logger?.warn(`${operation} blocked: offline mode`)

    return true
  }

  return false
}
