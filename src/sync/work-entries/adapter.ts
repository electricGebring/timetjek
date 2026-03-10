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
 * SyncEngine calls permanentDelete after success.
 */
async function deleteBlockOnApi(id: string): Promise<void> {
  const remoteBreaks = await fetchBreaksByWorkEntryId(id)
  for (const b of remoteBreaks) {
    await deleteWorkEntryBreak(b.id)
  }
  await deleteEntry(id)
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

  const syncLocalBreaksFromRemote = async (workEntryId: string) => {
    const remoteBreaks = remoteBreaksByEntryId.get(workEntryId) ?? []
    const localBreaks = await breakRepo.getBreaksByWorkEntryId(workEntryId)

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

    await breakRepo.deleteBreaksByWorkEntryId(workEntryId, false)
    if (remoteBreaks.length > 0) {
      await breakRepo.insertManyBreaks(
        remoteBreaks.map((b) => ({
          id: b.id,
          work_entry_id: workEntryId,
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
        try {
          await retryWithBackoff(() => deleteBlockOnApi(id), RETRY)
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
      try {
        await retryWithBackoff(() => deleteBlockOnApi(id), RETRY)
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
        const local = locals.find((e) => e.id === remoteItem.id)
        if (local?.synced === 0) return result
        // Do not overwrite local breaks with remote when we have unsynced breaks (would wipe local data)
        const hasUnsynced = await breakRepo.hasUnsyncedBreaks(remoteItem.id)
        if (hasUnsynced) return result
        await syncLocalBreaksFromRemote(remoteItem.id)
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
