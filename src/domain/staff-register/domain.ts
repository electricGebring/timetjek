import * as staffRepo from '@/db/staff-register/repo'

export const workEntryToEntry = staffRepo.workEntryToEntry

export {
  getAllWorkEntries,
  getUnsyncedWorkEntries,
  getDeletedWorkEntries,
  getWorkSchemeGrouped,
  upsertWorkEntryFromApi,
  canCheckIn,
  canCheckOut
} from './queries'

export { createWorkEntry, updateWorkEntry, deleteWorkEntry } from './commands'
export { updateStoreFromDb, updateStoreFromEntries } from './store-sync'
