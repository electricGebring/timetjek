/**
 * Node.js-based work entries domain (Drizzle ORM)
 * Queries + commands for backend/sync/test contexts (not in browser)
 */

import { createLogger } from '../../utils/logger'
import * as staffRepo from '../../db/work-entries/repo'
import * as breakRepo from '../../db/work-entry-breaks/repo'
import { hasOpenCheckIn } from './rules'
import { TimeRegistrationStatus } from '../../enums/TimeRegistrationStatus'
import type { DayGroup } from './types'
import type { WorkEntry } from '@/db/schema'
import type { WorkEntry as DrizzleWorkEntry } from '../../db/schema'

const logger = createLogger('WorkEntriesDomain-Drizzle')

function isWorkEntry(e: unknown): e is WorkEntry {
  if (typeof e !== 'object' || e === null) return false
  const obj = e as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
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

const normalizeEntry = (e: DrizzleWorkEntry) => ({
  ...e,
  work_day_id: e.work_day_id as number,
  createdAt: e.createdAt ?? '',
  updatedAt: e.updatedAt ?? '',
  meal_benefit_has_breakfast: !!e.meal_benefit_has_breakfast,
  meal_benefit_has_lunch: !!e.meal_benefit_has_lunch
})

// ─── Queries ───────────────────────────────────────────────────────────────

export async function getUnsyncedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getUnsyncedWorkEntries()
  return entries
    .filter((e: DrizzleWorkEntry) => e.work_day_id !== null && e.createdAt !== null)
    .map(normalizeEntry)
    .filter(isWorkEntry) as unknown as WorkEntry[]
}

export async function getDeletedWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getDeletedWorkEntries()
  return entries
    .filter((e: DrizzleWorkEntry) => e.work_day_id !== null && e.createdAt !== null)
    .map(normalizeEntry)
    .filter(isWorkEntry) as unknown as WorkEntry[]
}

export async function getAllWorkEntries(): Promise<WorkEntry[]> {
  const entries = await staffRepo.getWorkEntries()
  return entries
    .filter((e: DrizzleWorkEntry) => e.work_day_id !== null && e.createdAt !== null)
    .map(normalizeEntry)
    .filter(isWorkEntry) as unknown as WorkEntry[]
}

export async function canCheckIn(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter((e: DrizzleWorkEntry) => e.work_day_id === work_day_id)
  const hasOpen = hasOpenCheckIn(todays)
  if (!hasOpen) return true
  const openEntry = todays.find((e) => e.check_in_at && !e.check_out_at)
  if (!openEntry?.id) return false
  const breaks = await breakRepo.getBreaksByWorkEntryId(openEntry.id)
  return breaks.some((b) => b.end_at === null)
}

export async function canCheckOut(work_day_id: number): Promise<boolean> {
  const all = await staffRepo.getWorkEntries()
  const todays = all.filter((e: DrizzleWorkEntry) => e.work_day_id === work_day_id)
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
    if (!daysMap[date]) daysMap[date] = { date, dateLabel: date, entries: [] }
    daysMap[date].entries.push(entry)
  }
  return { days: Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date)) }
}

// ─── Commands ──────────────────────────────────────────────────────────────

export async function createWorkEntry(entry: Partial<WorkEntry>) {
  const { buildSafeWorkEntry } = await import('../../db/work-entries/work-entry.helpers')
  const safeEntry = buildSafeWorkEntry(entry)
  logger.log('[DRIZZLE] 🧠 Creating work entry...', safeEntry)
  await staffRepo.upsertWorkEntry(safeEntry)
  logger.log('[DRIZZLE] ✅ Work entry created')
}

export async function updateWorkEntry(entry: Partial<WorkEntry>) {
  if (entry.id === null || entry.id === undefined) {
    throw new Error('Cannot update entry without id')
  }
  if (entry.check_out_at) {
    if (entry.check_in_at && !entry.total_working_seconds && !entry.break) {
      entry.total_working_seconds = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at as string,
        entry.check_out_at as string,
        null
      )
    }
    if (entry.break && !entry.total_break_seconds) {
      entry.total_break_seconds = staffRepo.calculateTotalWorkingSeconds(
        entry.check_in_at as string,
        entry.check_out_at as string,
        entry.break as string
      )
    }
    if (entry.status === TimeRegistrationStatus.OPEN) {
      entry.status = TimeRegistrationStatus.CLOSED
    }
  }
  entry.updatedAt = new Date().toISOString()
  entry.synced = 0
  logger.log('[DRIZZLE] 🔄 Updating work entry...', entry)
  await staffRepo.upsertWorkEntry(entry)
  logger.log('[DRIZZLE] ✅ Work entry updated')
}

export async function deleteWorkEntry(id: string) {
  logger.log('[DRIZZLE] 🗑️ Soft deleting work entry...', { id })
  await staffRepo.softDeleteWorkEntry(id)
  logger.log('[DRIZZLE] ✅ Work entry soft deleted')
}

export async function hardDeleteWorkEntry(id: string) {
  logger.log('[DRIZZLE] 🔥 Hard deleting work entry...', { id })
  await staffRepo.permanentDeleteWorkEntry(id)
  logger.log('[DRIZZLE] ✅ Work entry hard deleted')
}

export async function restoreWorkEntry(id: string) {
  logger.log('[DRIZZLE] ↩️ Restoring work entry...', { id })
  await staffRepo.restoreWorkEntry(id)
  logger.log('[DRIZZLE] ✅ Work entry restored')
}
