/**
 * Sync mode for a table: controls offline storage and sync behavior.
 * Use across domain config, sync layer, and anywhere policy is evaluated.
 */
export const SyncMode = {
  /** Local-first: store locally, sync when online */
  OFFLINE_FIRST: 'offline-first',
  /** No local storage: always fetch from server */
  ONLINE_ONLY: 'online-only',
  /** Local storage but no sync (cache only) */
  CACHE_ONLY: 'cache-only'
} as const

export type SyncMode = (typeof SyncMode)[keyof typeof SyncMode]
