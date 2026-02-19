/**
 * Merge a remote work entry with the local one in memory (conflict resolution).
 * Does not persist to DB — the pull path only updates the store. DB is written only when pushing 
 * (unsynced → API → save result).
 */

import * as repo from '@/db/staff-register/repo'

import { defaultConflictResolver } from '@/sync/conflict-resolver'

import type { Entry, TimeRegistrationStatus, TimeRegistrationApplication } from '@/views/staffRegister/types'

import {
  ConflictResolutionStrategy,
  type ConflictResolutionStrategy as StrategyType
} from '@/enums/ConflictResolutionStrategy'

/** Entry shape for the conflict resolver (updatedAt as number). */
type ResolverEntry = Entry & { updatedAt?: number }

function toResolverFormat(entry: { updatedAt?: string | number | null }): ResolverEntry {
  const e = entry as Entry

  const updatedAt =
    e.updatedAt === null ? undefined : typeof e.updatedAt === 'string' ? Date.parse(e.updatedAt) : e.updatedAt

  return { ...e, updatedAt } as ResolverEntry
}

function fromResolverFormat(resolved: ResolverEntry): Entry {
  return {
    ...resolved,
    updatedAt:
      typeof resolved.updatedAt === 'number'
        ? new Date(resolved.updatedAt).toISOString()
        : ((resolved.updatedAt as string) ?? new Date().toISOString())
  }
}

/**
 * Resolve remote vs local in memory only (no DB write).
 * 1. Invalid remote (no id) → treat as conflict, return as-is.
 * 2. No local row → use remote and persist to DB as synced.
 * 3. Local has unsynced changes → keep local (do not overwrite).
 * 4. Otherwise → resolve with strategy, persist resolved to DB, and return.
 */
export async function mergeRemoteWorkEntry(
  remote: Entry,
  strategy: StrategyType = ConflictResolutionStrategy.LAST_WRITE_WINS
): Promise<{ resolved: Entry; conflictDetected: boolean }> {
  if (!remote.id) {
    // Return a dummy Entry with id 0 to satisfy type
    return { resolved: { ...remote, id: 0 }, conflictDetected: true }
  }

  const locals = await repo.getWorkEntries()

  const local = locals.find((e) => (e.id ?? 0) === (remote.id ?? 0))

  if (!local) {
    // No local entry: persist remote to DB as synced
    const safeRemote = {
      ...remote,
      id: remote.id ?? 0,
      work_day_id: remote.work_day_id ?? 0,
      check_in_at: remote.check_in_at ?? '',
      check_out_at: remote.check_out_at ?? '',
      check_in_time_at: remote.check_in_time_at ?? '',
      createdAt: remote.createdAt ?? new Date().toISOString(),
      updatedAt: remote.updatedAt ?? new Date().toISOString(),
      check_in_latitude: remote.check_in_latitude ?? 0,
      check_in_longitude: remote.check_in_longitude ?? 0,
      check_out_latitude: remote.check_out_latitude ?? 0,
      check_out_longitude: remote.check_out_longitude ?? 0,
      check_in_application: (remote.check_in_application ?? 'APP') as TimeRegistrationApplication,
      check_out_application: (remote.check_out_application ?? null) as TimeRegistrationApplication | null,
    }

    await repo.upsertWorkEntry({ ...safeRemote, synced: 1 })

    return { resolved: safeRemote, conflictDetected: false }
  }

  if (local.synced === 0) {
    // Local changes not ännu synkade: returnera local med säkra defaultvärden och rätt typ
    const resolvedLocal: Entry = {
      ...local,
      id: local.id ?? 0,
      work_day_id: local.work_day_id ?? 0,
      status: (local.status ?? 'UNKNOWN') as TimeRegistrationStatus,
      check_in_at: local.check_in_at ?? '',
      check_out_at: local.check_out_at ?? '',
      check_in_time_at: local.check_in_time_at ?? '',
      updatedAt: local.updatedAt ?? new Date().toISOString(),
      createdAt: local.createdAt ?? new Date().toISOString(),
      check_in_latitude: local.check_in_latitude ?? 0,
      check_in_longitude: local.check_in_longitude ?? 0,
      check_out_latitude: local.check_out_latitude ?? 0,
      check_out_longitude: local.check_out_longitude ?? 0,
      check_in_application: (local.check_in_application ?? 'APP') as TimeRegistrationApplication,
      check_out_application: (local.check_out_application ?? null) as TimeRegistrationApplication | null,
    }

    return { resolved: resolvedLocal, conflictDetected: false }
  }

  // Conflict resolution, persist result to DB only if changed (avoid unnecessary writes)
  const result = defaultConflictResolver.resolve(toResolverFormat(local), toResolverFormat(remote), strategy)

  const toPersist = fromResolverFormat(result.resolved as ResolverEntry)

  // Jämför local och toPersist, upserta bara om ändrad
  function entriesAreEqual(a: Entry, b: Entry): boolean {
    return a.id === b.id && a.updatedAt === b.updatedAt && a.status === b.status
  }


  // Ensure id and work_day_id are never null for Entry
  const safeToPersist: Entry = {
    ...toPersist,
    id: toPersist.id ?? 0,
    work_day_id: toPersist.work_day_id ?? 0,
    status: (toPersist.status ?? 'OPEN') as TimeRegistrationStatus,
    check_in_at: toPersist.check_in_at ?? '',
    check_in_time_at: toPersist.check_in_time_at ?? '',
    check_in_latitude: toPersist.check_in_latitude ?? 0,
    check_in_longitude: toPersist.check_in_longitude ?? 0,
    check_in_application: (toPersist.check_in_application ?? 'APP') as TimeRegistrationApplication,
    check_out_at: toPersist.check_out_at ?? null,
    check_out_time_at: toPersist.check_out_time_at ?? null,
    check_out_latitude: toPersist.check_out_latitude ?? null,
    check_out_longitude: toPersist.check_out_longitude ?? null,
    check_out_application: (toPersist.check_out_application ?? null) as TimeRegistrationApplication | null,
    break: toPersist.break ?? null,
    meal_benefit_has_breakfast: toPersist.meal_benefit_has_breakfast ?? false,
    meal_benefit_has_lunch: toPersist.meal_benefit_has_lunch ?? false,
    name: toPersist.name ?? '',
    type: toPersist.type ?? '',
    personalNumber: toPersist.personalNumber ?? '',
    administrator_comment: toPersist.administrator_comment ?? null,
    total_working_seconds: toPersist.total_working_seconds ?? null,
    createdAt: toPersist.createdAt ?? new Date().toISOString(),
    updatedAt: toPersist.updatedAt ?? new Date().toISOString(),
    deleted_at: toPersist.deleted_at ?? null,
    synced: toPersist.synced ?? 1,
    deleted: toPersist.deleted ?? 0,
    employee_id: toPersist.employee_id ?? 0,
    workplace_id: toPersist.workplace_id ?? 0,
    cost_center_id: toPersist.cost_center_id ?? 0,
  }

  // Ensure local has non-null id and required fields for comparison
  const safeLocal: Entry = {
    ...local,
    id: local.id ?? 0,
    work_day_id: local.work_day_id ?? 0,
    status: (local.status ?? 'OPEN') as TimeRegistrationStatus,
    check_in_at: local.check_in_at ?? '',
    check_in_time_at: local.check_in_time_at ?? '',
    check_in_latitude: local.check_in_latitude ?? 0,
    check_in_longitude: local.check_in_longitude ?? 0,
    check_in_application: (local.check_in_application ?? 'APP') as TimeRegistrationApplication,
    check_out_at: local.check_out_at ?? null,
    check_out_time_at: local.check_out_time_at ?? null,
    check_out_latitude: local.check_out_latitude ?? null,
    check_out_longitude: local.check_out_longitude ?? null,
    check_out_application: (local.check_out_application ?? null) as TimeRegistrationApplication | null,
    break: local.break ?? null,
    meal_benefit_has_breakfast: local.meal_benefit_has_breakfast ?? false,
    meal_benefit_has_lunch: local.meal_benefit_has_lunch ?? false,
    name: local.name ?? '',
    type: local.type ?? '',
    personalNumber: local.personalNumber ?? '',
    administrator_comment: local.administrator_comment ?? null,
    total_working_seconds: local.total_working_seconds ?? null,
    createdAt: local.createdAt ?? new Date().toISOString(),
    updatedAt: local.updatedAt ?? new Date().toISOString(),
    deleted_at: local.deleted_at ?? null,
    synced: local.synced ?? 1,
    deleted: local.deleted ?? 0,
    employee_id: local.employee_id ?? 0,
    workplace_id: local.workplace_id ?? 0,
    cost_center_id: local.cost_center_id ?? 0,
  }

  if (!entriesAreEqual(safeLocal, safeToPersist)) {
    await repo.upsertWorkEntry({ ...safeToPersist, synced: 1 })
  }

  return { resolved: toPersist, conflictDetected: result.conflictDetected }
}
