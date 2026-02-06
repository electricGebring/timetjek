/**
 * WorkEntry type and schema – single source of truth from Zod.
 * Re-export for backward compatibility so imports from './types' or '@/db/staff-register/types' still work.
 */
export type { WorkEntry, WorkEntryColumn } from './work-entry.schema'
export {
  workEntryRowSchema,
  WORK_ENTRY_COLUMNS,
  parseWorkEntryRow
} from './work-entry.schema'
