/**
 * Merge a remote work entry into local storage with conflict resolution.
 * Keeps merge logic and strategy in one place, separate from the sync adapter.
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
 * 1. Invalid remote (no id) → treat as conflict, return as-is.
 * 2. No local row → insert remote as synced.
 * 3. Local has unsynced changes → keep local (no overwrite).
 * 4. Else → resolve with strategy, persist resolved, return.
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
    await repo.upsertWorkEntry({ ...remote, synced: 1 })
    return { resolved: remote, conflictDetected: false }
  }

  if (local.synced === 0) {
    return { resolved: local as Entry, conflictDetected: false }
  }

  const result = defaultConflictResolver.resolve(toResolverFormat(local), toResolverFormat(remote), strategy)
  const toPersist = fromResolverFormat(result.resolved as ResolverEntry)
  await repo.upsertWorkEntry({ ...toPersist, synced: 1 })
  return { resolved: toPersist, conflictDetected: result.conflictDetected }
}
