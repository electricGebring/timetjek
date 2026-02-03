
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
  // Always load fresh data from DB before validation
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter(e => e.work_day_id === entry.work_day_id)
  const hasOpen = todays.some(e => e.timeIn && !e.timeOut)
  
  if (entry.timeIn && hasOpen) {
    throw new Error('Already checked in – check out required first.')
  }
  if (entry.timeOut && !hasOpen) {
    throw new Error('Cannot check out before checking in.')
  }
  await staffRepo.upsertWorkEntry(entry)
  await triggerSyncIfOnline('mutation')
}

// Update an existing work_entry (no validation needed for updates)
export async function updateWorkEntry(entry: any) {
  if (!entry.id) {
    throw new Error('Cannot update entry without id')
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

export async function getWorkSchemeGrouped() {
  const entries = await getAllWorkEntries(); // eller din fetch-funktion
  const daysMap: Record<string, { date: string, dateLabel: string, entries: any[] }> = {};
  for (const entry of entries) {
    const date = entry.createdAt?.slice(0, 10) ?? '';
    if (!date) continue; // skip entries without a valid date
    if (!daysMap[date]) {
      daysMap[date] = {
        date,
        dateLabel: date, // eller formatera datumet snyggt
        entries: []
      };
    }
    daysMap[date].entries.push(entry);
  }
  return { days: Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date)) };
}
