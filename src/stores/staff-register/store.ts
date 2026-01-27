
import { defineStore } from 'pinia'
import * as domain from '@/domain/staff-register/domain'

export const useStaffRegisterStore = defineStore('staffRegister', {
  state: () => ({
    workEntries: [] as any[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    setWorkEntries(entries: any[]) {
      this.workEntries = entries
    },
    addWorkEntry(entry: any) {
      this.workEntries.push(entry)
    },
    updateWorkEntry(updated: any) {
      const idx = this.workEntries.findIndex(e => e.id === updated.id)
      if (idx !== -1) this.workEntries[idx] = updated
    },
    removeWorkEntry(id: number) {
      this.workEntries = this.workEntries.filter(e => e.id !== id)
    },
    setLoading(val: boolean) {
      this.loading = val
    },
    setError(msg: string | null) {
      this.error = msg
    },

    /**
     * Loads all work entries from domain (local DB).
     */
    async loadWorkEntries() {
      this.setLoading(true)
      try {
        const entries = await domain.getAllWorkEntries()
        this.setWorkEntries(entries)
        this.setError(null)
      } catch (e: any) {
        this.setError(e?.message || 'Failed to load work entries')
      } finally {
        this.setLoading(false)
      }
    }
  }
})
