import { TABLE_WORK_ENTRIES, WORK_ENTRIES_AGGREGATE } from '@/constants/tables'

import { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'

import { SyncMode } from '@/enums/SyncMode'

/** Re-export for use across the project */
export { ConflictResolutionStrategy } from '@/enums/ConflictResolutionStrategy'

export { SyncMode } from '@/enums/SyncMode'

export type DataRetentionPolicy = {
  tableName: string
  syncMode: SyncMode
  retentionDays?: number
  softDeleteOnly?: boolean
  autoSync?: boolean
  conflictStrategy?: ConflictResolutionStrategy
  customCleanup?: (tableName: string) => Promise<number>
}

/** Child table in an aggregation (FK to root) */
export type AggregationChildTable = {
  table: string
  fkColumn: string
}

/** Aggregation policy: root table + child tables synced as one unit */
export type AggregationPolicy = {
  aggregationName: string
  rootTable: string
  childTables: AggregationChildTable[]
  syncMode: SyncMode
  retentionDays?: number
  softDeleteOnly?: boolean
  autoSync?: boolean
  conflictStrategy?: ConflictResolutionStrategy
}

// Default data policies configuration
// Register your data types here with their retention policies

export const DATA_POLICIES: Record<string, DataRetentionPolicy> = {
  [TABLE_WORK_ENTRIES]: {
    tableName: TABLE_WORK_ENTRIES,
    syncMode: SyncMode.OFFLINE_FIRST,
    retentionDays: 30,
    softDeleteOnly: true,
    autoSync: true,
    conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS
  }
}

/** Aggregation policies: parent + children synced together */
export const AGGREGATION_POLICIES: Record<string, AggregationPolicy> = {
  [WORK_ENTRIES_AGGREGATE]: {
    aggregationName: WORK_ENTRIES_AGGREGATE,
    rootTable: TABLE_WORK_ENTRIES,
    childTables: [{ table: 'work_entry_breaks', fkColumn: 'work_entry_id' }],
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
 * Get conflict resolution strategy for a table or aggregation (used during pull/merge).
 * Default: LAST_WRITE_WINS. Use LOCAL_WINS for draft-like data, REMOTE_WINS for server-authoritative.
 */
export function getConflictStrategy(tableOrAggregationKey: string): ConflictResolutionStrategy {
  const aggregation = AGGREGATION_POLICIES[tableOrAggregationKey]
  if (aggregation?.conflictStrategy) {
    return aggregation.conflictStrategy
  }
  const policy = getDataPolicy(tableOrAggregationKey)
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
  return (Object.values(DATA_POLICIES) as DataRetentionPolicy[]).filter(
    (policy) =>
      (policy.syncMode === SyncMode.OFFLINE_FIRST || policy.syncMode === SyncMode.CACHE_ONLY) &&
      policy.retentionDays !== undefined &&
      policy.retentionDays > 0
  )
}

/**
 * Get all policies that should be synced (table-based, for backward compatibility)
 */
export function getPoliciesForSync(): DataRetentionPolicy[] {
  return (Object.values(DATA_POLICIES) as DataRetentionPolicy[]).filter((policy) => shouldSyncTable(policy.tableName))
}

/**
 * Check if an aggregation should be synced
 */
function shouldSyncAggregation(aggregation: AggregationPolicy): boolean {
  if (aggregation.syncMode === SyncMode.ONLINE_ONLY) return false
  return aggregation.autoSync !== false
}

/**
 * Get all aggregation policies that should be synced
 */
export function getAggregationPoliciesForSync(): AggregationPolicy[] {
  return (Object.values(AGGREGATION_POLICIES) as AggregationPolicy[]).filter(shouldSyncAggregation)
}

/**
 * Get sync units for SyncManager: aggregations take precedence over their root tables.
 * Returns sync keys (aggregation names or table names) to sync.
 * When an aggregation exists for a table, we sync the aggregation instead of the table alone.
 */
export function getSyncUnitsForSync(): string[] {
  const aggregationPolicies = getAggregationPoliciesForSync()
  const rootTablesInAggregations = new Set(aggregationPolicies.map((ap) => ap.rootTable))
  const aggregationKeys = aggregationPolicies.map((ap) => ap.aggregationName)
  const tablePolicies = getPoliciesForSync()
  const tableKeys = tablePolicies.map((p) => p.tableName).filter((table) => !rootTablesInAggregations.has(table))
  return [...aggregationKeys, ...tableKeys]
}
