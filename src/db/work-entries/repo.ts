/**
 * Repository layer using Drizzle ORM
 * Works with sql.js (browser) and Capacitor SQLite (native)
 */

export { getWorkEntries, getUnsyncedWorkEntries, getDeletedWorkEntries, getWorkEntryById } from './work-entry.read'

export { upsertWorkEntry } from './work-entry.upsert'

export {
  softDeleteWorkEntry,
  restoreWorkEntry,
  markWorkEntryAsSynced,
  markParentEntryDirty,
  permanentDeleteWorkEntry,
  markEntriesAsSynced,
  deletePermanently
} from './work-entry.delete'

export { workEntryToEntry, entryToWorkEntry } from './work-entry.mapper'

export { calculateTotalWorkingSeconds } from './work-entry.helpers'
