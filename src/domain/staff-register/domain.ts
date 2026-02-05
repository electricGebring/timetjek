
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
import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

// Export the converter function
export const workEntryToEntry = staffRepo.workEntryToEntry

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

// Create a new work_entry
export async function createWorkEntry(entry: any) {
  // Set defaults
  const now = new Date().toISOString()
  const safeEntry = {
    ...entry,
    status: entry.status ?? TimeRegistrationStatus.OPEN,
    check_in_at: entry.check_in_at ?? now,
    check_out_at: entry.check_out_at ?? null,
    break: entry.break ?? null,
    total_working_seconds: entry.total_working_seconds ?? null,
    total_break_seconds: entry.total_break_seconds ?? null,
    createdAt: now,
    updatedAt: now,
    deleted_at: null,
    synced: 0,
    deleted: 0
  }
  
  await staffRepo.upsertWorkEntry(safeEntry)
  await triggerSyncIfOnline('mutation')
}

// Update an existing work_entry (no validation needed for updates)
export async function updateWorkEntry(entry: any) {
  if (!entry.id) {
    throw new Error('Cannot update entry without id')
  }

  // If check-out data is being added
  if (entry.check_out_at) {
    // Calculate working time for non-break entries
    if (entry.check_in_at && !entry.total_working_seconds && !entry.break) {
      entry.total_working_seconds = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at,
        entry.check_out_at,
        null
      )
    }
    
    // Calculate break duration for break entries
    if (entry.break && !entry.total_break_seconds) {
      const breakDuration = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at,
        entry.check_out_at,
        entry.break
      )
      entry.total_break_seconds = breakDuration
    }
    
    // Set status to CLOSED if still OPEN
    if (entry.status === TimeRegistrationStatus.OPEN) {
      entry.status = TimeRegistrationStatus.CLOSED
    }
  }

  entry.updatedAt = new Date().toISOString()
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
