/**
 * Merge a remote work entry with the local one in memory (conflict resolution).
 * Does not persist to DB — the pull path only updates the store. DB is written only when pushing (unsynced → API → save result).
 */

import * as repo from '@/db/staff-register/repo'
import { defaultConflictResolver } from '@/sync/conflict-resolver'
import type { Entry } from '@/views/staffRegister/types'
import {
  ConflictResolutionStrategy,
  type ConflictResolutionStrategy as StrategyType
} from '@/enums/ConflictResolutionStrategy'

/** Entry shape for the conflict resolver (updatedAt as number). */
type ResolverEntry = Entry & { updatedAt?: number }

function toResolverFormat(entry: { updatedAt?: string | number | null }): ResolverEntry {
  const e = entry as Entry
  const updatedAt =
    e.updatedAt == null ? undefined : typeof e.updatedAt === 'string' ? Date.parse(e.updatedAt) : e.updatedAt
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
    return { resolved: remote, conflictDetected: true }
  }

  const locals = await repo.getWorkEntries()
  const local = locals.find((e) => e.id === remote.id)

  if (!local) {
    // No local entry: persist remote to DB as synced
    await repo.upsertWorkEntry({ ...remote, synced: 1 })
    return { resolved: remote, conflictDetected: false }
  }

  if (local.synced === 0) {
    // Local changes not yet synced: do NOT overwrite, return local
    return { resolved: local as Entry, conflictDetected: false }
  }

  // Conflict resolution, persist result to DB only if changed (avoid unnecessary writes)
  const result = defaultConflictResolver.resolve(toResolverFormat(local), toResolverFormat(remote), strategy)
  const toPersist = fromResolverFormat(result.resolved as ResolverEntry)
  // Jämför local och toPersist, upserta bara om ändrad
  function entriesAreEqual(a: Entry, b: Entry): boolean {
    return (
      a.id === b.id &&
      a.updatedAt === b.updatedAt &&
      a.status === b.status
    );
  }
  if (!entriesAreEqual(local, toPersist)) {
    await repo.upsertWorkEntry({ ...toPersist, synced: 1 })
  }
  return { resolved: toPersist, conflictDetected: result.conflictDetected }
}
