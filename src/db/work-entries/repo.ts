/**
 * Repository layer using Drizzle ORM
 * Works with both sql.js (browser) and better-sqlite3 (tests/Node.js)
 */

export { 
  getWorkEntries, 
  getUnsyncedWorkEntries, 
  getDeletedWorkEntries 
} from './work-entry.read'

export { upsertWorkEntry } from './work-entry.upsert'

export {
  softDeleteWorkEntry,
  restoreWorkEntry,
  markWorkEntryAsSynced,
  permanentDeleteWorkEntry
} from './work-entry.delete'

// Sync-specific queries
export {
  getUnsyncedForSync,
  getDeletedForSync,
  markEntriesAsSynced,
  deletePermanently,
  mergeRemoteEntries
} from './work-entry.sync'

export { workEntryToEntry, entryToWorkEntry } from './work-entry.mapper'

export { calculateTotalWorkingSeconds } from './work-entry.helpers'

