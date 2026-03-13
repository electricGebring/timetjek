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
// Register your data types here with their retention policies.
// Tables that are roots of aggregations should NOT be in DATA_POLICIES;
// use AGGREGATION_POLICIES instead (single source of truth for sync + cleanup).

export const DATA_POLICIES: Record<string, DataRetentionPolicy> = {
  // work_entries is root of WORK_ENTRIES_AGGREGATE - config lives in AGGREGATION_POLICIES
}

/** Aggregation policies: parent + children synced together.
 * childTables is the canonical list of child tables (FK to root).
 * Used for sync orchestration; adapters may hardcode today but this drives cleanup and future policy-driven adapters. */
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
 * Get aggregation policy by sync key (e.g. work_entries_aggregate)
 */
export function getAggregationPolicy(syncKey: string): AggregationPolicy | undefined {
  return AGGREGATION_POLICIES[syncKey]
}

/**
 * Get aggregation policy for a root table (e.g. work_entries)
 */
export function getAggregationPolicyForRootTable(rootTable: string): AggregationPolicy | undefined {
  return (Object.values(AGGREGATION_POLICIES) as AggregationPolicy[]).find((ap) => ap.rootTable === rootTable)
}

/**
 * Get policy for a table. For root tables of aggregations, returns a derived policy from AGGREGATION_POLICIES.
 */
export function getDataPolicy(tableName: string): DataRetentionPolicy | undefined {
  const tablePolicy = DATA_POLICIES[tableName]

  if (tablePolicy) return tablePolicy

  const agg = getAggregationPolicyForRootTable(tableName)

  if (agg) {
    return {
      tableName: agg.rootTable,
      syncMode: agg.syncMode,
      retentionDays: agg.retentionDays,
      softDeleteOnly: agg.softDeleteOnly,
      autoSync: agg.autoSync,
      conflictStrategy: agg.conflictStrategy
    }
  }

  return undefined
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
 * Get all policies that need cleanup.
 * Uses AGGREGATION_POLICIES for root tables (single source of truth); DATA_POLICIES for standalone tables.
 */
export function getPoliciesNeedingCleanup(): DataRetentionPolicy[] {
  const rootTablesInAggregations = new Set(
    (Object.values(AGGREGATION_POLICIES) as AggregationPolicy[]).map((ap) => ap.rootTable)
  )

  const fromDataPolicies = (Object.values(DATA_POLICIES) as DataRetentionPolicy[]).filter(
    (policy) =>
      !rootTablesInAggregations.has(policy.tableName) &&
      (policy.syncMode === SyncMode.OFFLINE_FIRST || policy.syncMode === SyncMode.CACHE_ONLY) &&
      policy.retentionDays !== undefined &&
      policy.retentionDays > 0
  )

  const fromAggregations = (Object.values(AGGREGATION_POLICIES) as AggregationPolicy[]).filter(
    (agg) =>
      (agg.syncMode === SyncMode.OFFLINE_FIRST || agg.syncMode === SyncMode.CACHE_ONLY) &&
      agg.retentionDays !== undefined &&
      agg.retentionDays > 0
  )

  const aggregationCleanupPolicies: DataRetentionPolicy[] = fromAggregations.map((agg) => ({
    tableName: agg.rootTable,
    syncMode: agg.syncMode,
    retentionDays: agg.retentionDays!,
    softDeleteOnly: agg.softDeleteOnly,
    autoSync: agg.autoSync,
    conflictStrategy: agg.conflictStrategy
  }))

  return [...fromDataPolicies, ...aggregationCleanupPolicies]
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
