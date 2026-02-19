/**
 * Browser connectivity helpers. Use for sync/API code that should not run when offline.
 * SSR-safe: no window/navigator access when those are undefined.
 */

import type { Logger } from './logger'

/**
 * True when running in a browser and navigator reports offline.
 */
export function isBrowserOffline(): boolean {
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
