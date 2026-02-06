/**
 * Data retention and sync policies configuration
 * Define per-table policies for offline support, retention, sync behavior, and conflict resolution
 */

import { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'
import { SyncMode } from '@/enums/SyncMode'

/** Re-export for use across the project */
export { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'
export { SyncMode } from '@/enums/SyncMode'

export type DataRetentionPolicy = {
  /** Table/entity name */
  tableName: string
  /** Sync mode: offline-first (syncs), online-only (no local storage), cache-only (local but no sync) */
  syncMode: SyncMode
  /** Retention period in days (only applies to offline-first and cache-only) */
  retentionDays?: number
  /** Only clean up soft-deleted items (for offline-first) */
  softDeleteOnly?: boolean
  /** Whether to sync this table automatically */
  autoSync?: boolean
  /** Conflict resolution when local and remote differ */
  conflictStrategy?: ConflictResolutionStrategy
  /** Custom cleanup function (optional) */
  customCleanup?: (tableName: string) => Promise<number>
}

/**
 * Default data policies configuration
 * Register your data types here with their retention policies
 */
export const DATA_POLICIES: Record<string, DataRetentionPolicy> = {
  work_entries: {
    tableName: 'work_entries',
    syncMode: SyncMode.OFFLINE_FIRST,
    retentionDays: 30,
    softDeleteOnly: true,
    autoSync: true,
    conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS
  }
}

/**
 * Get policy for a table
 */
export function getDataPolicy(tableName: string): DataRetentionPolicy | undefined {
  return DATA_POLICIES[tableName]
}

/**
 * Check if a table should be synced
 */
export function shouldSyncTable(tableName: string): boolean {
  const policy = getDataPolicy(tableName)
  if (!policy) return false // Unknown tables are not synced by default
  if (policy.syncMode === SyncMode.ONLINE_ONLY) return false // Online-only doesn't sync
  return policy.autoSync !== false // Default to true unless explicitly false
}

/**
 * Check if a table supports offline storage
 */
export function supportsOfflineStorage(tableName: string): boolean {
  const policy = getDataPolicy(tableName)
  if (!policy) return false
  return policy.syncMode === SyncMode.OFFLINE_FIRST || policy.syncMode === SyncMode.CACHE_ONLY
}

/**
 * Get retention days for a table
 */
export function getRetentionDays(tableName: string): number | undefined {
  const policy = getDataPolicy(tableName)
  return policy?.retentionDays
}

/**
 * Check if table should use soft-delete-only cleanup
 */
export function shouldSoftDeleteOnly(tableName: string): boolean {
  const policy = getDataPolicy(tableName)
  return policy?.softDeleteOnly === true
}

/**
 * Get conflict resolution strategy for a table (used during pull/merge).
 * Default: LAST_WRITE_WINS. Use LOCAL_WINS for draft-like data, REMOTE_WINS for server-authoritative.
 */
export function getConflictStrategy(tableName: string): ConflictResolutionStrategy {
  const policy = getDataPolicy(tableName)
  return policy?.conflictStrategy ?? ConflictResolutionStrategy.LAST_WRITE_WINS
}

/**
 * Register a new data policy
 */
export function registerDataPolicy(policy: DataRetentionPolicy): void {
  DATA_POLICIES[policy.tableName] = policy
}

/**
 * Get all policies that need cleanup
 */
export function getPoliciesNeedingCleanup(): DataRetentionPolicy[] {
  return Object.values(DATA_POLICIES).filter(
    (policy) =>
      (policy.syncMode === SyncMode.OFFLINE_FIRST || policy.syncMode === SyncMode.CACHE_ONLY) &&
      policy.retentionDays !== undefined &&
      policy.retentionDays > 0
  )
}

/**
 * Get all policies that should be synced
 */
export function getPoliciesForSync(): DataRetentionPolicy[] {
  return Object.values(DATA_POLICIES).filter((policy) => shouldSyncTable(policy.tableName))
}
