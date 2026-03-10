import { defineStore } from 'pinia'

import * as domain from '@/domain/work-entries/domain'
import * as breakRepo from '@/db/work-entry-breaks/repo'

import { buildBreakDisplayString, hasOpenBreak } from '@/utils/breakDisplay'

import { WORK_ENTRY_STORE_ERRORS } from './constants'

import type { Entry, GroupedWorkEntries, DayGroup } from '@/views/staffRegister/types'

import { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

export const useWorkEntriesStore = defineStore('staffRegister', {
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
    removeWorkEntry(id: string) {
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

      const convertedGrouped = {
        days: grouped.days.map((day: DayGroup) => ({
          ...day,
          entries: day.entries
            .filter((entry) => {
              if (typeof entry.id === 'string') return entry.id.trim().length > 0
              if (typeof entry.id === 'number') return true

              return false
            })
            .map((e) => domain.workEntryToEntry(e))
        }))
      }

      this.setGroupedWorkEntries(convertedGrouped)
    },

    /**
     * Group already-loaded entries by date without re-reading from DB.
     * Used on page initialization to avoid double-loading data.
     */
    setGroupedEntriesFromLoaded(entries: Entry[]) {
      const grouped = domain.groupWorkEntriesByDate(
        entries.map((e) => ({
          ...e,
          createdAt: e.createdAt ?? '',
          updatedAt: e.updatedAt ?? '',
          work_day_id: e.work_day_id ?? 0
        })) as any
      )

      const convertedGrouped = {
        days: grouped.days.map((day: DayGroup) => ({
          ...day,
          entries: day.entries
            .filter((entry) => {
              if (typeof entry.id === 'string') return entry.id.trim().length > 0
              if (typeof entry.id === 'number') return true

              return false
            })
            .map((e) => domain.workEntryToEntry(e))
        }))
      }

      this.setGroupedWorkEntries(convertedGrouped)
    },

    /**
     * Loads all work entries from domain (local DB).
     * Enriches each entry with break display from work_entry_breaks (På rast + RAST column).
     */
    async loadWorkEntries() {
      this.setLoading(true)

      try {
        const [entries, breaksByEntryId] = await Promise.all([
          domain.getAllWorkEntries(),
          breakRepo.getBreaksGroupedByWorkEntryId()
        ])

        // Convert WorkEntry to Entry format
        const convertedEntries = entries.map(domain.workEntryToEntry)

        // Enrich with break data from work_entry_breaks for table display (single batch lookup)
        for (const entry of convertedEntries) {
          const breaks = breaksByEntryId.get(entry.id) ?? []
          entry.break = buildBreakDisplayString(entry, breaks)
          entry.isOnBreak = hasOpenBreak(breaks) && !entry.check_out_at
        }

        this.setWorkEntries(convertedEntries)

        this.setError(null)
      } catch (e: unknown) {
        this.setError((e as Error)?.message ?? 'Failed to load work entries')
      } finally {
        this.setLoading(false)
      }
    },

    async checkIn(work_day_id: number) {
      this.logger.log('[2. STORE] 📦 Calling domain.createWorkEntry...', { work_day_id })

      const all = await domain.getAllWorkEntries()

      const todays = all.filter((e) => e.work_day_id === work_day_id)

      const openWorkEntry = todays.find((e) => e.check_in_at && !e.check_out_at)

      // If there is an open work entry, treat check-in as "return from break" when needed.
      if (openWorkEntry?.id) {
        const breaks = await breakRepo.getBreaksByWorkEntryId(openWorkEntry.id)
        const openBreak = breaks.find((b) => b.end_at === null)

        if (openBreak) {
          const now = new Date().toISOString()

          // Return from break: close the open break only; keep the same work entry
          await breakRepo.updateBreak(openBreak.id, {
            end_at: now,
            end_exact_at: now
          })

          await this.loadWorkEntries()
          return
        }

        throw new Error(WORK_ENTRY_STORE_ERRORS.ALREADY_CLOCKED_IN)
      }

      // Defensive re-fetch before create to avoid duplicate same-day entries (read-your-writes)
      const freshAll = await domain.getAllWorkEntries()
      const freshTodays = freshAll.filter((e) => e.work_day_id === work_day_id)
      const freshOpen = freshTodays.find((e) => e.check_in_at && !e.check_out_at)
      if (freshOpen?.id) {
        throw new Error(WORK_ENTRY_STORE_ERRORS.ALREADY_CLOCKED_IN)
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

      // Find open work entry
      const openEntry = entries.find((e) => e.work_day_id === work_day_id && e.check_in_at && !e.check_out_at)

      if (!openEntry?.id) {
        throw new Error(WORK_ENTRY_STORE_ERRORS.NO_OPEN_CHECK_IN)
      }

      const now = new Date().toISOString()

      // Get all breaks for this work entry
      const breaks = await breakRepo.getBreaksByWorkEntryId(openEntry.id)

      // Close any open break before checking out
      const openBreak = breaks.find((b) => b.end_at === null)

      if (openBreak) {
        // Close the open break
        await breakRepo.updateBreak(openBreak.id, {
          end_at: now,
          end_exact_at: now
        })
        // Update the break in our local list for calculation
        openBreak.end_at = now
        openBreak.end_exact_at = now
      }

      // Calculate total break time in seconds
      const breakSeconds = breaks.reduce((sum, brk) => {
        const start = brk.start_exact_at ?? brk.start_at
        const end = brk.end_exact_at ?? brk.end_at

        if (!start || !end) return sum

        const startMs = Date.parse(start)
        const endMs = Date.parse(end)

        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return sum

        return sum + Math.max(0, Math.floor((endMs - startMs) / 1000))
      }, 0)

      // Calculate total time from check-in to check-out
      const checkInAt = openEntry.check_in_at ?? null
      const startMs = checkInAt ? Date.parse(checkInAt) : Number.NaN
      const endMs = Date.parse(now)

      const totalSeconds =
        Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? Math.floor((endMs - startMs) / 1000)
          : null

      // Update work entry with check-out time and calculated seconds
      await domain.updateWorkEntry({
        ...openEntry,
        work_day_id: openEntry.work_day_id ?? 0,
        createdAt: openEntry.createdAt ?? '',
        updatedAt: now,
        check_out_at: now,
        check_out_time_at: now.split('T')[1]?.split('.')[0] || '',
        total_working_seconds: totalSeconds !== null ? Math.max(0, totalSeconds - breakSeconds) : null,
        total_break_seconds: breakSeconds
      })

      await this.loadWorkEntries()
    },

    async goOnBreak(work_day_id: number) {
      const entries = await domain.getAllWorkEntries()

      const todaysEntries = entries.filter((e) => e.work_day_id === work_day_id)

      const openEntry = todaysEntries.find((e) => e.check_in_at && !e.check_out_at)

      if (!openEntry?.id) {
        throw new Error(WORK_ENTRY_STORE_ERRORS.NO_OPEN_CHECK_IN)
      }

      const existingBreaks = await breakRepo.getBreaksByWorkEntryId(openEntry.id)
      const hasOpenBreak = existingBreaks.some((b) => b.end_at === null)

      if (hasOpenBreak) {
        throw new Error(WORK_ENTRY_STORE_ERRORS.ALREADY_ON_BREAK)
      }

      const now = new Date().toISOString()

      // Create the break record; keep the work entry open (no check_out_at)
      await breakRepo.insertBreak(openEntry.id, {
        start_at: now,
        end_at: null,
        start_exact_at: now,
        end_exact_at: null
      })

      await this.loadWorkEntries()
    }
  }
})
