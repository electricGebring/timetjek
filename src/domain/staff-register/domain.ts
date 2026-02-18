/**
 * Staff register domain – public API (barrel).
 * Layered: rules (pure) ← queries (read) / commands (write) / store-sync (UI).
 */

import * as staffRepo from '@/db/staff-register/repo'

// Re-export mapping used by store and sync
export const workEntryToEntry = staffRepo.workEntryToEntry

// Queries (read + validation)
export {
  getAllWorkEntries,
  getUnsyncedWorkEntries,
  getDeletedWorkEntries,
  getWorkSchemeGrouped,
  upsertWorkEntryFromApi,
  canCheckIn,
  canCheckOut
} from './queries'

// Commands (write use cases)
export { createWorkEntry, updateWorkEntry, deleteWorkEntry } from './commands'

// Store boundary
export { updateStoreFromDb } from './store-sync'
