/**
 * Data retention and sync policies configuration
 * Define per-table policies for offline support, retention, and sync behavior
 */

export type DataSyncMode = 'offline-first' | 'online-only' | 'cache-only'

export type DataRetentionPolicy = {
  /** Table/entity name */
  tableName: string
  /** Sync mode: offline-first (syncs), online-only (no local storage), cache-only (local but no sync) */
  syncMode: DataSyncMode
  /** Retention period in days (only applies to offline-first and cache-only) */
  retentionDays?: number
  /** Only clean up soft-deleted items (for offline-first) */
  softDeleteOnly?: boolean
  /** Whether to sync this table automatically */
  autoSync?: boolean
  /** Custom cleanup function (optional) */
  customCleanup?: (tableName: string) => Promise<number>
}

/**
 * Default data policies configuration
 * Register your data types here with their retention policies
 */
export const DATA_POLICIES: Record<string, DataRetentionPolicy> = {
  todos: {
    tableName: 'todos',
    syncMode: 'offline-first',
    retentionDays: 30,
    softDeleteOnly: true,
    autoSync: true,
  },
  work_entries: {
    tableName: 'work_entries',
    syncMode: 'offline-first',
    retentionDays: 30,
    softDeleteOnly: true,
    autoSync: true,
  },
  // staffRegister can be kept as an alias if desired, but work_entries controls sync
  // Example: Online-only data (no local storage)
  // notifications: {
  //   tableName: 'notifications',
  //   syncMode: 'online-only',
  //   autoSync: false, // Fetched on-demand only
  // },
  // Example: Cache-only data (local but no sync)
  // settings: {
  //   tableName: 'settings',
  //   syncMode: 'cache-only',
  //   retentionDays: 90, // Keep settings longer
  //   autoSync: false,
  // },
  // Example: Different retention period
  // logs: {
  //   tableName: 'logs',
  //   syncMode: 'offline-first',
  //   retentionDays: 7, // Only keep logs for 7 days
  //   softDeleteOnly: false, // Clean up all old logs
  //   autoSync: true,
  // },
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
  if (policy.syncMode === 'online-only') return false // Online-only doesn't sync
  return policy.autoSync !== false // Default to true unless explicitly false
}

/**
 * Check if a table supports offline storage
 */
export function supportsOfflineStorage(tableName: string): boolean {
  const policy = getDataPolicy(tableName)
  if (!policy) return false
  return policy.syncMode === 'offline-first' || policy.syncMode === 'cache-only'
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
      (policy.syncMode === 'offline-first' || policy.syncMode === 'cache-only') &&
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
