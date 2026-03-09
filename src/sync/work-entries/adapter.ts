import type { TableSyncAdapter } from '../table-sync-adapter'

import { TABLE_WORK_ENTRIES } from '@/constants/tables'

import { assertOnline, whenOffline } from '@/utils/connectivity'

import { retryWithBackoff } from '../retry-utils'

import * as repo from '@/db/work-entries/repo'
import * as breakRepo from '@/db/work-entry-breaks/repo'

import { fetchWorkEntries, deleteEntry } from '@/api/work-entries'
import {
  fetchWorkEntryBreaks,
  fetchBreaksByWorkEntryId,
  createWorkEntryBreak,
  deleteWorkEntryBreak
} from '@/api/work-entry-breaks'

import type { Entry } from '@/views/staffRegister/types'
import type { WorkEntryBreak } from '@/models/work-entry-break.schema'

import type { ConflictResolutionStrategy as ConflictStrategyType } from '@/enums/ConflictResolutionStrategy'

import { mergeRemoteWorkEntry } from './merge-remote'

export function createWorkEntriesAdapter(): TableSyncAdapter<Entry> {
  const remoteBreaksByEntryId = new Map<string, WorkEntryBreak[]>()

  const fetchEntriesOrThrow = async (api: typeof import('@/api/work-entries')) => {
    return await api.fetchWorkEntries()
  }

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

    const normalizeForCompare = (
      breaks: Array<Pick<WorkEntryBreak, 'start_at' | 'end_at' | 'start_exact_at' | 'end_exact_at'>>
    ) =>
      [...breaks]
        .map((item) => ({
          start_at: item.start_at ?? null,
          end_at: item.end_at ?? null,
          start_exact_at: item.start_exact_at ?? null,
          end_exact_at: item.end_exact_at ?? null
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

    const localComparable = normalizeForCompare(localBreaks)
    const remoteComparable = normalizeForCompare(remoteBreaks)

    if (JSON.stringify(localComparable) === JSON.stringify(remoteComparable)) {
      return
    }

    await breakRepo.deleteBreaksByWorkEntryId(workEntryId, false)

    if (remoteBreaks.length > 0) {
      await breakRepo.insertManyBreaks(
        remoteBreaks.map((item) => ({
          id: item.id,
          work_entry_id: workEntryId,
          start_at: item.start_at,
          end_at: item.end_at,
          start_exact_at: item.start_exact_at,
          end_exact_at: item.end_exact_at
        }))
      )
    }
  }

  const syncRemoteBreaksFromLocal = async (workEntryId: string) => {
    const [localBreaks, remoteBreaks] = await Promise.all([
      breakRepo.getBreaksByWorkEntryId(workEntryId),
      fetchBreaksByWorkEntryId(workEntryId)
    ])

    for (const remoteBreak of remoteBreaks) {
      await deleteWorkEntryBreak(remoteBreak.id)
    }

    for (const localBreak of localBreaks) {
      await createWorkEntryBreak(workEntryId, {
        start_at: localBreak.start_at,
        end_at: localBreak.end_at,
        start_exact_at: localBreak.start_exact_at,
        end_exact_at: localBreak.end_exact_at
      })
    }
  }

  /** Push one aggregate (entry + breaks) with retry to avoid partial remote state */
  const pushAggregate = async (entry: Entry, api: typeof import('@/api/work-entries')) => {
    const existsInApi = (await fetchEntriesOrThrow(api)).some((e) => e.id === entry.id)
    let resultItem: Entry
    if (existsInApi) {
      resultItem = await api.updateEntry(entry)
    } else {
      resultItem = await api.createEntry(entry)
    }
    await repo.upsertWorkEntry(repo.entryToWorkEntry(resultItem))
    await syncRemoteBreaksFromLocal(resultItem.id)
    return resultItem
  }

  return {
    tableName: TABLE_WORK_ENTRIES,
    getUnsynced: async (): Promise<Entry[]> => {
      const unsynced = (await repo.getUnsyncedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry)

      return unsynced
    },
    getDeleted: async (): Promise<Entry[]> =>
      (await repo.getDeletedWorkEntries()).filter((e) => e.id !== null).map(repo.workEntryToEntry),
    markAsSynced: async (id: string): Promise<void> => {
      await repo.markWorkEntryAsSynced(id)
    },
    permanentDelete: async (id: string): Promise<void> => {
      await repo.permanentDeleteWorkEntry(id)
    },
    batchUpsert: async (items: Entry[]): Promise<Entry[]> => {
      assertOnline('batchUpsert')

      const api = await import('@/api/work-entries')
      const results: Entry[] = []

      for (const item of items) {
        if (typeof item !== 'object' || item === null || !('id' in item)) continue
        const entry = item as Entry
        if (!entry.id) continue

        const resultItem = await retryWithBackoff(() => pushAggregate(entry, api), {
          maxRetries: 3,
          initialDelay: 1000,
          retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'ECONNRESET', 'ETIMEDOUT']
        })
        results.push(resultItem)
      }

      return results
    },
    batchDelete: async (ids: string[]): Promise<void> => {
      if (whenOffline('batchDelete')) return

      for (const id of ids) {
        try {
          await retryWithBackoff(
            async () => {
              const remoteBreaks = await fetchBreaksByWorkEntryId(id)
              for (const remoteBreak of remoteBreaks) {
                await deleteWorkEntryBreak(remoteBreak.id)
              }
              await deleteEntry(id)
            },
            {
              maxRetries: 3,
              initialDelay: 1000,
              retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'ECONNRESET', 'ETIMEDOUT']
            }
          )
        } catch (e) {
          if (
            typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string' &&
            (e as { message: string }).message.includes('404')
          ) {
            continue
          }
          throw e
        }
      }
    },
    createItem: async (item: Entry): Promise<Entry> => {
      assertOnline('createItem')

      if (typeof item !== 'object' || item === null || !('id' in item)) {
        throw new Error('Invalid item: not an Entry')
      }

      const entry = item as Entry
      const api = await import('@/api/work-entries')

      return retryWithBackoff(() => pushAggregate(entry, api), {
        maxRetries: 3,
        initialDelay: 1000,
        retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'ECONNRESET', 'ETIMEDOUT']
      })
    },
    deleteItem: async (id: string): Promise<void> => {
      if (whenOffline('deleteItem')) return

      await retryWithBackoff(
        async () => {
          const remoteBreaks = await fetchBreaksByWorkEntryId(id)
          for (const remoteBreak of remoteBreaks) {
            await deleteWorkEntryBreak(remoteBreak.id)
          }
          await deleteEntry(id)
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          retryableErrors: ['NetworkError', 'Failed to fetch', 'timeout', 'ECONNRESET', 'ETIMEDOUT']
        }
      )
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
    fetchSince: async (): Promise<Entry[]> => {
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
        const localEntries = await repo.getWorkEntries()

        const localEntry = localEntries.find((item) => item.id === remoteItem.id)

        if (localEntry?.synced === 0) {
          return result
        }

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
