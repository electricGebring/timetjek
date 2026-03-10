import * as breakRepo from '@/db/work-entry-breaks/repo'

import { buildBreakDisplayString, hasOpenBreak } from '@/utils/breakDisplay'

import type { Entry } from '@/views/staffRegister/types'

import { getAllWorkEntries } from './queries'

import { workEntryToEntry } from '@/db/work-entries/repo'

/** Enrich entries with break display from work_entry_breaks (source of truth for break state). */
async function enrichEntriesWithBreaks(entries: Entry[]): Promise<Entry[]> {
  const breaksByEntryId = await breakRepo.getBreaksGroupedByWorkEntryId()

  return entries.map((entry) => {
    const breaks = breaksByEntryId.get(entry.id) ?? []
    const isOnBreak = hasOpenBreak(breaks) && !entry.check_out_at
    return {
      ...entry,
      break: buildBreakDisplayString(entry, breaks),
      isOnBreak
    }
  })
}

export async function updateStoreFromDb() {
  const allEntries = await getAllWorkEntries()

  const { useWorkEntriesStore } = await import('@/stores/work-entries/store')

  const store = useWorkEntriesStore()

  const entryList: Entry[] = allEntries.map(workEntryToEntry)

  const enriched = await enrichEntriesWithBreaks(entryList)

  store.setWorkEntries(enriched)
}

/** Update store from a list of entries (e.g. after pull: resolved API items + unsynced local). */
export async function updateStoreFromEntries(entries: Entry[]) {
  const { useWorkEntriesStore } = await import('@/stores/work-entries/store')

  const store = useWorkEntriesStore()

  const enriched = await enrichEntriesWithBreaks(entries)

  store.setWorkEntries(enriched)
}
