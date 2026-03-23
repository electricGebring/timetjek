import { getDb } from '@/db/drizzle'

import { workEntryBreaks } from '@/db/schema'

import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

import { parseWorkEntryBreakRow } from '@/models/work-entry-break.schema'

import { and, eq } from 'drizzle-orm'

/**
 * Whether this work entry has any unsynced (non-deleted) breaks.
 * Used to avoid overwriting local breaks with remote when local has pending changes.
 */
export async function hasUnsyncedBreaks(workEntryId: string): Promise<boolean> {
  const db = getDb()

  const result = await db
    .select()
    .from(workEntryBreaks)
    .where(
      and(eq(workEntryBreaks.work_entry_id, workEntryId), eq(workEntryBreaks.deleted, 0), eq(workEntryBreaks.synced, 0))
    )
    .limit(1)

  return result.length > 0
}

/**
 * Get all non-deleted breaks for a specific work entry
 */
export async function getBreaksByWorkEntryId(workEntryId: string): Promise<WorkEntryBreak[]> {
  const db = getDb()

  const results = await db
    .select()
    .from(workEntryBreaks)
    .where(and(eq(workEntryBreaks.work_entry_id, workEntryId), eq(workEntryBreaks.deleted, 0)))

  return results.map((row) => parseWorkEntryBreakRow(row as Record<string, unknown>))
}

/**
 * Get soft-deleted, unsynced breaks for a work entry (for sync: deletions to push to API)
 */
export async function getDeletedUnsyncedBreaksByWorkEntryId(workEntryId: string): Promise<WorkEntryBreak[]> {
  const db = getDb()

  const results = await db
    .select()
    .from(workEntryBreaks)
    .where(
      and(eq(workEntryBreaks.work_entry_id, workEntryId), eq(workEntryBreaks.deleted, 1), eq(workEntryBreaks.synced, 0))
    )

  return results.map((row) => parseWorkEntryBreakRow(row as Record<string, unknown>))
}

/**
 * Get a single break by its ID
 */
export async function getBreakById(id: string): Promise<WorkEntryBreak | null> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks).where(eq(workEntryBreaks.id, id))

  if (results.length === 0) {
    return null
  }

  return parseWorkEntryBreakRow(results[0] as Record<string, unknown>)
}

/**
 * Get all breaks (for debugging/admin)
 */
export async function getAllBreaks(): Promise<WorkEntryBreak[]> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks)

  return results.map((row) => parseWorkEntryBreakRow(row as Record<string, unknown>))
}

/**
 * Get all non-deleted breaks grouped by work_entry_id.
 * Single query instead of N+1; use for enriching multiple entries.
 */
export async function getBreaksGroupedByWorkEntryId(): Promise<Map<string, WorkEntryBreak[]>> {
  const db = getDb()

  const results = await db.select().from(workEntryBreaks).where(eq(workEntryBreaks.deleted, 0))

  const map = new Map<string, WorkEntryBreak[]>()

  for (const row of results) {
    const parsed = parseWorkEntryBreakRow(row as Record<string, unknown>)

    const wid = parsed.work_entry_id

    if (!map.has(wid)) {
      map.set(wid, [])
    }

    map.get(wid)!.push(parsed)
  }

  return map
}
