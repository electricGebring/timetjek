import { getAllWorkEntries } from './queries'

export async function updateStoreFromDb() {
  const allEntries = await getAllWorkEntries()
  const { useStaffRegisterStore } = await import('@/stores/staff-register/store')
  const store = useStaffRegisterStore()
  store.setWorkEntries(allEntries)
}
