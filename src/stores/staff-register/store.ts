import { defineStore } from 'pinia'
import * as domain from '@/domain/staff-register/domain'
import type { GroupedWorkEntries } from '@/views/staffRegister/types'

export const useStaffRegisterStore = defineStore('staffRegister', {
  state: () => ({
    workEntries: [] as any[],
    groupedWorkEntries: null as GroupedWorkEntries | null,
    loading: false,
    error: null as string | null
  }),
  actions: {
    setWorkEntries(entries: any[]) {
      this.workEntries = entries
    },
    setGroupedWorkEntries(grouped: GroupedWorkEntries) {
      this.groupedWorkEntries = grouped
    },
    async addWorkEntryWithDefaults(entry: any) {
      await domain.createWorkEntry(entry)
    },
    async updateWorkEntry(entry: any) {
      await domain.updateWorkEntry(entry)
    },
    removeWorkEntry(id: number) {
      this.workEntries = this.workEntries.filter((e) => e.id !== id)
    },
    setLoading(val: boolean) {
      this.loading = val
    },
    setError(msg: string | null) {
      this.error = msg
    },
    async loadGroupedWorkEntries() {
      const grouped = await domain.getWorkSchemeGrouped()
      this.setGroupedWorkEntries(grouped)
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
