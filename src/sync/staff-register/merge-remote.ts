/**
 * Merge a remote work entry with local in memory (conflict resolution).
 * Does not persist to DB — pull path only updates the store. DB is written only when pushing (unsynced → API → save result).
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
 * 2. No local row → use remote.
 * 3. Local has unsynced changes → keep local (no overwrite).
 * 4. Else → resolve with strategy, return resolved.
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
    return { resolved: remote, conflictDetected: false }
  }

  if (local.synced === 0) {
    return { resolved: local as Entry, conflictDetected: false }
  }

  const result = defaultConflictResolver.resolve(toResolverFormat(local), toResolverFormat(remote), strategy)
  const resolved = fromResolverFormat(result.resolved as ResolverEntry)
  return { resolved, conflictDetected: result.conflictDetected }
}
