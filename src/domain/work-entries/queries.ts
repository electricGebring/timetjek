import * as staffRepo from '@/db/work-entries/repo'

import { hasOpenCheckIn } from './rules'

import type { DayGroup } from './types'

import type { WorkEntry } from '@/models/work-entry.schema'

function isWorkEntry(e: unknown): e is WorkEntry {
  if (typeof e !== 'object' || e === null) return false

  const obj = e as Record<string, unknown>

  return (
    typeof obj.id === 'number' &&
    typeof obj.work_day_id === 'number' &&
    (typeof obj.check_in_at === 'string' || obj.check_in_at === null) &&
    (typeof obj.check_out_at === 'string' || obj.check_out_at === null) &&
    (typeof obj.break === 'string' || obj.break === null) &&
    (typeof obj.total_working_seconds === 'number' || obj.total_working_seconds === null) &&
    (typeof obj.total_break_seconds === 'number' || obj.total_break_seconds === null) &&
    typeof obj.status === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    (typeof obj.deleted_at === 'string' || obj.deleted_at === null) &&
    typeof obj.synced === 'number' &&
    typeof obj.deleted === 'number'
  )
}

export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getUnsyncedWorkEntries()

  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
      meal_benefit_has_breakfast: !!e.meal_benefit_has_breakfast,
      meal_benefit_has_lunch: !!e.meal_benefit_has_lunch
    }))
    .filter(isWorkEntry) as unknown as WorkEntry[]
}

export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getDeletedWorkEntries()

  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
      meal_benefit_has_breakfast: !!e.meal_benefit_has_breakfast,
      meal_benefit_has_lunch: !!e.meal_benefit_has_lunch
    }))
    .filter(isWorkEntry) as unknown as WorkEntry[]
}

export async function getAllWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getWorkEntries()

  return entries
    .filter((e) => e.work_day_id !== null && e.createdAt !== null)
    .map((e) => ({
      ...e,
      work_day_id: e.work_day_id as number,
      createdAt: e.createdAt ?? '',
      updatedAt: e.updatedAt ?? '',
      meal_benefit_has_breakfast: !!e.meal_benefit_has_breakfast,
      meal_benefit_has_lunch: !!e.meal_benefit_has_lunch
    }))
    .filter(isWorkEntry) as unknown as WorkEntry[]
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
