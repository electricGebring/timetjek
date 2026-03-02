/**
 * Drizzle ORM-based repository
 * Used in Vue app (browser with sql.js) and tests (Node.js with better-sqlite3)
 */

export { getWorkEntriesDrizzle as getWorkEntries } from './work-entry.read.drizzle'
export { getUnsyncedWorkEntries } from './work-entry.read.drizzle'
export { getDeletedWorkEntries } from './work-entry.read.drizzle'

export { upsertWorkEntry } from './work-entry.upsert.drizzle'

export {
  softDeleteWorkEntry,
  restoreWorkEntry,
  markWorkEntryAsSynced,
  permanentDeleteWorkEntry
} from './work-entry.delete.drizzle'

// Sync-specific queries
export {
  getUnsyncedForSync,
  getDeletedForSync,
  markEntriesAsSynced,
  deletePermanently
} from './work-entry.sync.drizzle'

export { workEntryToEntry } from './work-entry.mapper'

export { calculateTotalWorkingSeconds } from './work-entry.helpers'
