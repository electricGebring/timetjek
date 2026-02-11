/**
 * Global table names for DB, sync, and policies.
 * Single source of truth so the same identifier is used everywhere.
 */

/** Staff register work entries table (sync + offline storage) */
export const TABLE_WORK_ENTRIES = 'work_entries' as const

/** Table names that participate in sync (for type-safe registration and policies) */
export type SyncTableName = typeof TABLE_WORK_ENTRIES
