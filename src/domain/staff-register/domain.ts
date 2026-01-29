
// Update Pinia store directly from db (for reactive UI updates after sync)
export async function updateStoreFromDb() {
  const allEntries = await getAllWorkEntries();
  const { useStaffRegisterStore } = await import('@/stores/staff-register/store')
  const store = useStaffRegisterStore();
  store.setWorkEntries(allEntries);
}

/**
 * Domain logic for staffRegister (business logic, validation, sync, etc)
 */
import * as staffRepo from '@/db/staff-register/repo'
import { triggerSyncIfOnline } from '../services/sync-trigger'

// Get all work_entries
export async function getAllWorkEntries() {
  return await staffRepo.getWorkEntries()
}

// Helper: Check if there is an open check-in (last entry has timeIn but no timeOut)
function hasOpenCheckIn(entries: any[]): boolean {
  const last = [...entries].reverse().find(e => e.timeIn)
  return !!last && !last.timeOut
}

// Validate if check-in is allowed
export async function canCheckIn(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter(e => e.work_day_id === work_day_id)
  return !hasOpenCheckIn(todays)
}

// Validate if check-out is allowed
export async function canCheckOut(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter(e => e.work_day_id === work_day_id)
  return hasOpenCheckIn(todays)
}

// Create a new work_entry with business rule validation
export async function createWorkEntry(entry: any) {
  if (entry.timeIn && !(await canCheckIn(entry.work_day_id))) {
    throw new Error('Already checked in – check out required first.')
  }
  if (entry.timeOut && !(await canCheckOut(entry.work_day_id))) {
    throw new Error('Cannot check out before checking in.')
  }
  await staffRepo.upsertWorkEntry(entry)
  await triggerSyncIfOnline('mutation')
}

// Soft delete a work_entry (optional implementation)
export async function deleteWorkEntry(_id: number) {
  // You can implement soft delete in the repo if needed
  // await staffRepo.deleteWorkEntry(id)
  // await triggerSyncIfOnline('mutation')
}

// Get unsynced work_entries
export async function getUnsyncedWorkEntries() {
  return await staffRepo.getUnsyncedWorkEntries()
}

// Get deleted work_entries that are not yet synced
export async function getDeletedWorkEntries() {
  return await staffRepo.getDeletedWorkEntries()
}

// Upsert from API (or merge logic)
export async function upsertWorkEntryFromApi(entry: any) {
  await staffRepo.upsertWorkEntry(entry)
}
