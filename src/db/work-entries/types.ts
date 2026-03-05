/**
 * WorkEntry type and schema – single source of truth from Zod.
 * Re-export for backward compatibility so imports from './types' or '@/db/work-entries/types' still work.
 */
export type { WorkEntry, WorkEntryColumn } from '@/models/work-entry.schema'

export { WORK_ENTRY_COLUMNS, parseWorkEntryRow } from '@/models/work-entry.schema'
