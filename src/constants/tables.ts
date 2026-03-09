/**
 * Global table names for DB, sync, and policies.
 * Single source of truth so the same identifier is used everywhere.
 */

/** Staff register work entries table (sync + offline storage) */
export const TABLE_WORK_ENTRIES = 'work_entries' as const

/** Staff register work entry breaks table (sync + offline storage) */
export const TABLE_WORK_ENTRY_BREAKS = 'work_entry_breaks' as const

/** Aggregation of work_entries + work_entry_breaks for sync */
export const WORK_ENTRIES_AGGREGATE = 'work_entries_aggregate' as const

/** Table names that participate in sync (for type-safe registration and policies) */
export type SyncTableName = typeof TABLE_WORK_ENTRIES | typeof TABLE_WORK_ENTRY_BREAKS | typeof WORK_ENTRIES_AGGREGATE
