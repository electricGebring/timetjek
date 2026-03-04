import { getAllWorkEntries } from './queries'

import { workEntryToEntry } from '@/db/work-entries/repo'

import type { Entry } from '@/views/staffRegister/types'

export async function updateStoreFromDb() {
  const allEntries = await getAllWorkEntries()

  const { useWorkEntriesStore } = await import('@/stores/work-entries/store')

  const store = useWorkEntriesStore()

  // Map WorkEntry[] to Entry[]
  const entryList: Entry[] = allEntries.map(workEntryToEntry)

  store.setWorkEntries(entryList)
}

/** Update store from a list of entries (e.g. after pull: resolved API items + unsynced local). */
export async function updateStoreFromEntries(entries: Entry[]) {
  const { useWorkEntriesStore } = await import('@/stores/work-entries/store')

  const store = useWorkEntriesStore()

  store.setWorkEntries(entries)
}
