/**
 * Read-side: fetch and aggregate work entries.
 * Delegates to repo; no write or sync trigger.
 */

import * as staffRepo from '@/db/staff-register/repo'
import { hasOpenCheckIn } from './rules'

export async function getAllWorkEntries() {
  return staffRepo.getWorkEntries()
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

export async function getUnsyncedWorkEntries() {
  return staffRepo.getUnsyncedWorkEntries()
}

export async function getDeletedWorkEntries() {
  return staffRepo.getDeletedWorkEntries()
}

export async function upsertWorkEntryFromApi(entry: Record<string, unknown>) {
  await staffRepo.upsertWorkEntry(entry)
}

export type DayGroup = { date: string; dateLabel: string; entries: unknown[] }

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
