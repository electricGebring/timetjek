import { defineStore } from 'pinia'
import * as domain from '@/domain/staff-register/domain'
import type { GroupedWorkEntries } from '@/views/staffRegister/types'
import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

export const useStaffRegisterStore = defineStore('staffRegister', {
  state: () => ({
    workEntries: [] as any[],
    groupedWorkEntries: null as GroupedWorkEntries | null,
    loading: false,
    error: null as string | null
  }),
  getters: {
    /** Total number of seconds worked across all entries */
    totalWorkingSeconds(): number {
      return this.workEntries.reduce((sum, entry) => {
        return sum + (entry.total_working_seconds || 0)
      }, 0)
    },

    /** Summary of entries by status */
    statusSummary(): Record<TimeRegistrationStatus, number> {
      return {
        [TimeRegistrationStatus.OPEN]: this.workEntries.filter((e) => e.status === TimeRegistrationStatus.OPEN).length,
        [TimeRegistrationStatus.CLOSED]: this.workEntries.filter((e) => e.status === TimeRegistrationStatus.CLOSED)
          .length,
        [TimeRegistrationStatus.FORGOT_CHECK_OUT]: this.workEntries.filter(
          (e) => e.status === TimeRegistrationStatus.FORGOT_CHECK_OUT
        ).length,
        [TimeRegistrationStatus.AWAITS_APPROVAL]: this.workEntries.filter(
          (e) => e.status === TimeRegistrationStatus.AWAITS_APPROVAL
        ).length
      }
    }
  },
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
        // Convert WorkEntry to Entry format
        const convertedEntries = entries.map((e) => domain.workEntryToEntry(e))
        this.setWorkEntries(convertedEntries)
        this.setError(null)
      } catch (e: any) {
        this.setError(e?.message || 'Failed to load work entries')
      } finally {
        this.setLoading(false)
      }
    },

    async checkIn(work_day_id: number) {
      console.log('[2. STORE] 📦 Calling domain.createWorkEntry...', { work_day_id })
      const all = await domain.getAllWorkEntries()
      const todays = all.filter((e) => e.work_day_id === work_day_id)

      // Check if there's an open break entry (has break field and is still open)
      const breakEntry = todays.find((e) => e.check_in_at && !e.check_out_at && e.break)

      if (breakEntry) {
        // Close the break entry and update break time with actual end time
        const now = new Date().toISOString()
        const breakStart = breakEntry.break?.split('-')[0] || '00:00:00'
        const breakEnd = now.split('T')[1]?.split('.')[0] || '00:00:00'

        await domain.updateWorkEntry({
          ...breakEntry,
          check_out_at: now,
          break: `${breakStart}-${breakEnd}`
        })

        // After closing break entry, reload to get updated data
        await this.loadWorkEntries()
      } else {
        // Check if there's already an open work entry
        const hasOpen = todays.some((e) => e.check_in_at && !e.check_out_at)
        if (hasOpen) {
          throw new Error('Du är redan instämplad. Stämpla ut först.')
        }
      }

      await domain.createWorkEntry({
        work_day_id,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19870312-1234'
      })

      await this.loadWorkEntries()
    },

    async checkOut(work_day_id: number) {
      const entries = await domain.getAllWorkEntries()
      // Find open work entry (not a break entry)
      const openEntry = entries.find(
        (e) => e.work_day_id === work_day_id && e.check_in_at && !e.check_out_at && !e.break
      )

      if (!openEntry) {
        throw new Error('Ingen öppen instämpling hittades')
      }

      await domain.updateWorkEntry({
        ...openEntry,
        check_out_at: new Date().toISOString()
      })

      await this.loadWorkEntries()
    },

    async goOnBreak(work_day_id: number) {
      const entries = await domain.getAllWorkEntries()
      const todaysEntries = entries.filter((e) => e.work_day_id === work_day_id)

      // Check if already on break (entry with break field set but no check_out)
      const onBreak = todaysEntries.some((e) => e.check_in_at && !e.check_out_at && e.break)
      if (onBreak) {
        throw new Error('Du är redan på rast')
      }

      // Find open work entry and close it
      const openEntry = todaysEntries.find((e) => e.check_in_at && !e.check_out_at)
      if (openEntry) {
        await domain.updateWorkEntry({
          ...openEntry,
          check_out_at: new Date().toISOString()
        })
      }

      // Create new break entry with break start time (end will be set when returning)
      const now = new Date().toISOString()
      const breakStart = now.split('T')[1]?.split('.')[0] || '00:00:00'

      const breakValue = `${breakStart}-00:00:00`

      await domain.createWorkEntry({
        work_day_id,
        check_in_at: now,
        check_out_at: null,
        name: openEntry?.name || '',
        type: openEntry?.type || '',
        personalNumber: openEntry?.personalNumber || '',
        break: breakValue // Placeholder end time
      })

      await this.loadWorkEntries()
    }
  }
})
