import type { TableSyncAdapter } from '../table-sync-adapter'

import { TABLE_WORK_ENTRIES } from '@/constants/tables'

import { assertOnline, whenOffline } from '@/utils/connectivity'

import { retryWithBackoff } from '../retry-utils'

import * as repo from '@/db/work-entries/repo'
import * as breakRepo from '@/db/work-entry-breaks/repo'

import { fetchWorkEntries, deleteEntry } from '@/api/work-entries'
import { fetchWorkEntryBreaks, fetchBreaksByWorkEntryId, deleteWorkEntryBreak } from '@/api/work-entry-breaks'

import type { Entry } from '@/views/staffRegister/types'
import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

import type { ConflictResolutionStrategy as ConflictStrategyType } from '@/enums/ConflictResolutionStrategy'

import { mergeRemoteWorkEntry } from './merge-remote'

import { is404, PushBlockEngine } from './push-block-engine'

const RETRY = {
  maxRetries: 3,
  initialDelay: 1000,
  retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'ECONNRESET', 'ETIMEDOUT']
}

/** Push one block (entry + breaks) to API, then persist as synced. Transactional. */
async function pushBlock(entry: Entry): Promise<Entry> {
  const engine = new PushBlockEngine(entry)
  return engine.run()
}

/**
 * Delete one block (entry + breaks) on API only.
 * Uses remote_id (server id) when available; falls back to id for backward compat.
 */
async function deleteBlockOnApi(entry: { id: string; remote_id?: string | null }): Promise<void> {
  const apiId = (entry.remote_id ?? entry.id).trim() || entry.id
  const remoteBreaks = await fetchBreaksByWorkEntryId(apiId)
  for (const b of remoteBreaks) {
    await deleteWorkEntryBreak(b.id)
  }
  await deleteEntry(apiId)
}

export function createWorkEntriesAdapter(): TableSyncAdapter<Entry> {
  const remoteBreaksByEntryId = new Map<string, WorkEntryBreak[]>()

  const setRemoteBreaksCache = (breaks: WorkEntryBreak[]) => {
    remoteBreaksByEntryId.clear()
    for (const item of breaks) {
      const workEntryId = item.work_entry_id
      if (!remoteBreaksByEntryId.has(workEntryId)) {
        remoteBreaksByEntryId.set(workEntryId, [])
      }
      remoteBreaksByEntryId.get(workEntryId)!.push(item)
    }
  }

  /** Sync local breaks from remote. remoteEntryId = API work_entry_id (server id); localEntryId = our work_entries.id */
  const syncLocalBreaksFromRemote = async (remoteEntryId: string, localEntryId: string) => {
    const remoteBreaks = remoteBreaksByEntryId.get(remoteEntryId) ?? []
    const localBreaks = await breakRepo.getBreaksByWorkEntryId(localEntryId)

    const normalize = (arr: Array<Pick<WorkEntryBreak, 'start_at' | 'end_at' | 'start_exact_at' | 'end_exact_at'>>) =>
      [...arr]
        .map((b) => ({
          start_at: b.start_at ?? null,
          end_at: b.end_at ?? null,
          start_exact_at: b.start_exact_at ?? null,
          end_exact_at: b.end_exact_at ?? null
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

    if (JSON.stringify(normalize(localBreaks)) === JSON.stringify(normalize(remoteBreaks))) {
      return
    }

    await breakRepo.deleteBreaksByWorkEntryId(localEntryId, false)
    if (remoteBreaks.length > 0) {
      await breakRepo.insertManyBreaks(
        remoteBreaks.map((b) => ({
          id: b.id,
          work_entry_id: localEntryId,
          start_at: b.start_at,
          end_at: b.end_at,
          start_exact_at: b.start_exact_at,
          end_exact_at: b.end_exact_at
        })),
        { synced: true }
      )
    }
  }

  return {
    tableName: TABLE_WORK_ENTRIES,
    getUnsynced: async (): Promise<Entry[]> =>
      (await repo.getUnsyncedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry),
    getDeleted: async (): Promise<Entry[]> =>
      (await repo.getDeletedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry),
    markAsSynced: (id: string) => repo.markWorkEntryAsSynced(id),
    permanentDelete: (id: string) => repo.permanentDeleteWorkEntry(id),
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      assertOnline('batchUpsert')
      const results: Entry[] = []
      for (const item of items) {
        if (typeof item !== 'object' || item === null || !('id' in item) || !(item as Entry).id) continue
        const result = await retryWithBackoff(() => pushBlock(item as Entry), RETRY)
        results.push(result)
      }
      return results
    },
    batchDelete: async (ids: string[]): Promise<void> => {
      if (whenOffline('batchDelete')) return
      for (const id of ids) {
        const entry = await repo.getWorkEntryById(id)
        try {
          await retryWithBackoff(() => deleteBlockOnApi(entry ?? { id }), RETRY)
        } catch (e) {
          if (!is404(e)) throw e
        }
      }
    },
    createItem: async (item: Entry): Promise<Entry> => {
      assertOnline('createItem')
      if (typeof item !== 'object' || item === null || !('id' in item)) {
        throw new Error('Invalid item: not an Entry')
      }
      return retryWithBackoff(() => pushBlock(item), RETRY)
    },
    deleteItem: async (id: string): Promise<void> => {
      if (whenOffline('deleteItem')) return
      const entry = await repo.getWorkEntryById(id)
      try {
        await retryWithBackoff(() => deleteBlockOnApi(entry ?? { id }), RETRY)
      } catch (e) {
        if (!is404(e)) throw e
      }
    },
    fetchAll: async (): Promise<Entry[]> => {
      try {
        const [entries, remoteBreaks] = await Promise.all([fetchWorkEntries(), fetchWorkEntryBreaks()])
        setRemoteBreaksCache(remoteBreaks)
        return entries
      } catch {
        remoteBreaksByEntryId.clear()
        return []
      }
    },
    fetchSince: async (_timestamp: number): Promise<Entry[]> => {
      try {
        const [entries, remoteBreaks] = await Promise.all([fetchWorkEntries(), fetchWorkEntryBreaks()])
        setRemoteBreaksCache(remoteBreaks)
        return entries
      } catch {
        remoteBreaksByEntryId.clear()
        return []
      }
    },
    mergeRemote: async (remoteItem: Entry, strategy?: ConflictStrategyType) => {
      const result = await mergeRemoteWorkEntry(remoteItem, strategy)
      if (remoteItem.id) {
        const locals = await repo.getWorkEntries()
        const remoteServerId = remoteItem.id
        const local = locals.find(
          (e) => (e.remote_id != null && e.remote_id === remoteServerId) || (e.id ?? '') === remoteServerId
        )
        if (!local) return result
        if (local.synced === 0) return result
        const hasUnsynced = await breakRepo.hasUnsyncedBreaks(local.id)
        if (hasUnsynced) return result
        await syncLocalBreaksFromRemote(remoteServerId, local.id)
      }
      return result
    },
    updateStore: async (entries?: Entry[]): Promise<void> => {
      const domain = await import('@/domain/work-entries/domain')
      if (entries && Array.isArray(entries)) {
        await domain.updateStoreFromEntries(entries)
      } else {
        await domain.updateStoreFromDb()
      }
    }
  }
}
