import { getAllWorkEntries } from './queries'

import { workEntryToEntry } from '@/db/staff-register/repo'

import type { Entry } from '@/views/staffRegister/types'

export async function updateStoreFromDb() {
  const allEntries = await getAllWorkEntries()

  const { useStaffRegisterStore } = await import('@/stores/staff-register/store')

  const store = useStaffRegisterStore()

  // Map WorkEntry[] to Entry[]
  const entryList: Entry[] = allEntries.map(workEntryToEntry)

  store.setWorkEntries(entryList)
}

/** Update store from a list of entries (e.g. after pull: resolved API items + unsynced local). */
export async function updateStoreFromEntries(entries: Entry[]) {
  const { useStaffRegisterStore } = await import('@/stores/staff-register/store')

  const store = useStaffRegisterStore()

  store.setWorkEntries(entries)
}
