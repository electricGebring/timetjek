import { defineStore } from 'pinia'

import * as domain from '@/domain/staff-register/domain'

import type { Entry, GroupedWorkEntries, DayGroup } from '@/views/staffRegister/types'

import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

export const useStaffRegisterStore = defineStore('staffRegister', {
  state: () => ({
    workEntries: [] as Entry[],
    groupedWorkEntries: null as GroupedWorkEntries | null,
    loading: false,
    error: null as string | null,
    logger: console // You can replace 'console' with a custom logger if needed
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
    setWorkEntries(entries: Entry[]) {
      this.workEntries = entries
    },
    setGroupedWorkEntries(grouped: GroupedWorkEntries) {
      this.groupedWorkEntries = grouped
    },
    async addWorkEntryWithDefaults(entry: Entry) {
      await domain.createWorkEntry(entry)
    },
    async updateWorkEntry(entry: Entry) {
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

      // Convert all entries to the correct Entry type (ensure id is number, not null)
      const convertedGrouped = {
        days: grouped.days.map((day: DayGroup) => ({
          ...day,
          entries: day.entries
            .filter((entry) => entry.id !== null)
            .map((entry) => ({
              ...entry,
              id: Number(entry.id),
              work_day_id: entry.work_day_id !== null ? Number(entry.work_day_id) : 0
            })) as Entry[]
        }))
      }

      this.setGroupedWorkEntries(convertedGrouped)
    },

    /**
     * Loads all work entries from domain (local DB).
     */
    async loadWorkEntries() {
      this.setLoading(true)

      try {
        const entries = await domain.getAllWorkEntries()

        // Convert WorkEntry to Entry format
        const convertedEntries = entries.map(domain.workEntryToEntry)

        this.setWorkEntries(convertedEntries)

        this.setError(null)
      }
 catch (e: unknown) {
        if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: string }).message === 'string') {
          this.setError((e as { message: string }).message)
        }
 else {
          this.setError('Failed to load work entries')
        }
      }
 finally {
        this.setLoading(false)
      }
    },

    async checkIn(work_day_id: number) {
      this.logger.log('[2. STORE] 📦 Calling domain.createWorkEntry...', { work_day_id })

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
          work_day_id: breakEntry.work_day_id ?? 0,
          createdAt: breakEntry.createdAt ?? '',
          updatedAt: breakEntry.updatedAt ?? '',
          check_out_at: now,
          break: `${breakStart}-${breakEnd}`
        })

        // After closing break entry, reload to get updated data
        await this.loadWorkEntries()
      }
 else {
        // Check if there's already an open work entry
        const hasOpen = todays.some((e) => e.check_in_at && !e.check_out_at)

        if (hasOpen) {
          throw new Error('Du är redan instämplad. Stämpla ut först.')
        }
      }

      const now = new Date().toISOString()

      await domain.createWorkEntry({
        work_day_id: work_day_id ?? 0,
        employee_id: 1,
        workplace_id: 1,
        cost_center_id: null,
        status: 'OPEN',
        check_in_at: now,
        check_in_time_at: now.split('T')[1]?.split('.')[0] || '',
        check_in_latitude: 0,
        check_in_longitude: 0,
        check_in_application: 'APP',
        check_out_at: null,
        check_out_time_at: null,
        check_out_latitude: null,
        check_out_longitude: null,
        check_out_application: null,
        break: null,
        meal_benefit_has_breakfast: false,
        meal_benefit_has_lunch: false,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19800101-1234',
        administrator_comment: null,
        total_working_seconds: null,
        createdAt: now,
        updatedAt: now,
        deleted_at: null,
        synced: 0,
        deleted: 0
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
        work_day_id: openEntry.work_day_id ?? 0,
        createdAt: openEntry.createdAt ?? '',
        updatedAt: openEntry.updatedAt ?? '',
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
          work_day_id: openEntry.work_day_id ?? 0,
          createdAt: openEntry.createdAt ?? '',
          updatedAt: openEntry.updatedAt ?? '',
          check_out_at: new Date().toISOString()
        })
      }

      // Create new break entry with break start time (end will be set when returning)
      const now = new Date().toISOString()

      const breakStart = now.split('T')[1]?.split('.')[0] || '00:00:00'

      const breakValue = `${breakStart}-00:00:00`

      await domain.createWorkEntry({
        work_day_id: work_day_id ?? 0,
        check_in_at: now,
        check_out_at: null,
        break: breakValue, // Placeholder end time
        employee_id: 1,
        workplace_id: 1,
        cost_center_id: null,
        status: 'OPEN',
        check_in_time_at: now.split('T')[1]?.split('.')[0] || '',
        check_in_latitude: 0,
        check_in_longitude: 0,
        check_in_application: 'APP',
        check_out_time_at: null,
        check_out_latitude: null,
        check_out_longitude: null,
        check_out_application: null,
        meal_benefit_has_breakfast: false,
        meal_benefit_has_lunch: false,
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19800101-1234',
        administrator_comment: null,
        total_working_seconds: null,
        createdAt: now,
        updatedAt: now,
        deleted_at: null,
        synced: 0,
        deleted: 0
      })

      await this.loadWorkEntries()
    }
  }
})
