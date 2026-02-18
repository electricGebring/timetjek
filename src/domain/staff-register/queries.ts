

function isWorkEntry(e: any): e is WorkEntry {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof e.id === 'number' &&
    typeof e.work_day_id === 'number' &&
    (typeof e.check_in_at === 'string' || e.check_in_at === null) &&
    (typeof e.check_out_at === 'string' || e.check_out_at === null) &&
    (typeof e.break === 'string' || e.break === null) &&
    (typeof e.total_working_seconds === 'number' || e.total_working_seconds === null) &&
    (typeof e.total_break_seconds === 'number' || e.total_break_seconds === null) &&
    typeof e.status === 'string' &&
    typeof e.createdAt === 'string' &&
    typeof e.updatedAt === 'string' &&
    (typeof e.deleted_at === 'string' || e.deleted_at === null) &&
    typeof e.synced === 'number' &&
    typeof e.deleted === 'number'
  );
}

export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getUnsyncedWorkEntries();
  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
    }))
    .filter(isWorkEntry);
}

export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getDeletedWorkEntries();
  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
    }))
    .filter(isWorkEntry);
}
/**
 * Read-side: fetch and aggregate work entries.
 * Delegates to repo; no write or sync trigger.
 */

import * as staffRepo from '@/db/staff-register/repo'
import { hasOpenCheckIn } from './rules'
import type { DayGroup } from './types'
import type { WorkEntry } from '@/models/work-entry.schema'


export async function getAllWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getWorkEntries();
  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
    }))
    .filter(isWorkEntry);
}

export async function canCheckIn(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter((e) => e.work_day_id === work_day_id)
  return !hasOpenCheckIn(todays)
}

export async function canCheckOut(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter((e) => e.work_day_id === work_day_id)
  return hasOpenCheckIn(todays)
}



export async function upsertWorkEntryFromApi(entry: Partial<WorkEntry>) {
  await staffRepo.upsertWorkEntry(entry)
}

export async function getWorkSchemeGrouped(): Promise<{ days: DayGroup[] }> {
  const entries = await getAllWorkEntries()
  const daysMap: Record<string, DayGroup> = {}
  for (const entry of entries) {
    const date = (entry as { createdAt?: string }).createdAt?.slice(0, 10) ?? ''
    if (!date) continue
    if (!daysMap[date]) {
      daysMap[date] = { date, dateLabel: date, entries: [] }
    }
    daysMap[date].entries.push(entry)
  }
  return { days: Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date)) }
}
