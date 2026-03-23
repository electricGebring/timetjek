import { computed, type Ref } from 'vue'

import type { Entry } from '@/views/staffRegister/types'

export type DisplayRow = {
  rowId: string
  entryId: string
  name: string
  type: string
  personalNumber: string
  check_in_at: string | null
  check_in_time_at: string | null
  check_out_at: string | null
  check_out_time_at: string | null
  break: string | null
  total_working_seconds: number | null
  isOnBreak?: boolean
  status: Entry['status']
  statusLabel?: 'Slutförd' | 'På arbete' | 'På rast' | 'Rast' | 'Saknas tid'
  sortMs: number
}

export function useWorkEntryList(workEntries: Ref<Entry[]>) {

  const getArr = () => (Array.isArray(workEntries.value) ? workEntries.value : [])

  // Type guard for work entry objects
  function isWorkEntry(obj: unknown): obj is Entry {
    return typeof obj === 'object' && obj !== null && 'id' in obj && 'createdAt' in obj
  }

  function toMs(value: string | null | undefined): number {
    if (!value) return 0

    const parsed = Date.parse(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  function toTimePart(value: string | null | undefined): string | null {
    if (!value) return null

    const d = new Date(value)

    if (Number.isNaN(d.getTime())) return null

    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
  }

  function parseTimeToSeconds(value: string | null | undefined): number | null {
    if (!value) return null

    const [hRaw, mRaw, sRaw] = value.split(':')

    const h = Number(hRaw)

    const m = Number(mRaw)

    const s = Number(sRaw ?? '0')

    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null

    return h * 3600 + m * 60 + s
  }

  function durationSeconds(start: string | null, end: string | null): number | null {
    const s = parseTimeToSeconds(start)

    const e = parseTimeToSeconds(end)

    if (s === null || e === null) return null

    const diff = e - s

    return diff >= 0 ? diff : null
  }

  function normalizeTime(value: string | null | undefined): string | null {
    if (!value) return null

    const parts = value.split(':')

    const hh = (parts[0] ?? '').padStart(2, '0')

    const mm = (parts[1] ?? '00').padStart(2, '0')

    const ss = (parts[2] ?? '00').padStart(2, '0')

    if (!hh || !mm || !ss) return null

    return `${hh}:${mm}:${ss}`
  }

  function parseBreakSegments(value: string | null | undefined): Array<{ start: string; end: string | null }> {
    if (!value) return []

    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((segment) => {
        const [startRaw, endRaw] = segment.split('-')

        return {
          start: normalizeTime((startRaw ?? '').trim()) ?? '00:00:00',
          end: normalizeTime((endRaw ?? '').trim())
        }
      })
  }

  function buildDisplayRowsForEntry(entry: Entry): DisplayRow[] {
    const rows: DisplayRow[] = []

    const breakSegments = parseBreakSegments(entry.break)

    const openBreak = breakSegments.find((segment) => !segment.end)

    let cursor = normalizeTime(entry.check_in_time_at) ?? toTimePart(entry.check_in_at)

    const baseMs = Math.max(
      toMs(entry.updatedAt),
      toMs(entry.check_out_at),
      toMs(entry.check_in_at),
      toMs(entry.createdAt)
    )

    breakSegments.forEach((segment, idx) => {
      const workTo = segment.start

      rows.push({
        rowId: `${entry.id}:work:${idx}`,
        entryId: entry.id,
        name: entry.name,
        type: entry.type,
        personalNumber: entry.personalNumber,
        check_in_at: entry.check_in_at,
        check_in_time_at: cursor,
        check_out_at: entry.check_out_at,
        check_out_time_at: workTo,
        break: null,
        total_working_seconds: durationSeconds(cursor, workTo),
        isOnBreak: false,
        status: 'CLOSED',
        statusLabel: 'Slutförd',
        sortMs: baseMs + idx * 10
      })

      rows.push({
        rowId: `${entry.id}:break:${idx}`,
        entryId: entry.id,
        name: entry.name,
        type: 'P',
        personalNumber: entry.personalNumber,
        check_in_at: entry.check_in_at,
        check_in_time_at: segment.start,
        check_out_at: entry.check_out_at,
        check_out_time_at: segment.end,
        break: `${segment.start.slice(0, 5)}-${segment.end ? segment.end.slice(0, 5) : ''}`,
        total_working_seconds: null,
        isOnBreak: !segment.end,
        status: segment.end ? 'CLOSED' : 'OPEN',
        statusLabel: segment.end ? 'Rast' : 'På rast',
        sortMs: baseMs + idx * 10 + 1
      })

      cursor = segment.end
    })

    if (!openBreak) {
      const finalOut = normalizeTime(entry.check_out_time_at) ?? toTimePart(entry.check_out_at)

      rows.push({
        rowId: `${entry.id}:work:final`,
        entryId: entry.id,
        name: entry.name,
        type: entry.type,
        personalNumber: entry.personalNumber,
        check_in_at: entry.check_in_at,
        check_in_time_at: cursor,
        check_out_at: entry.check_out_at,
        check_out_time_at: finalOut,
        break: null,
        total_working_seconds: durationSeconds(cursor, finalOut) ?? entry.total_working_seconds,
        isOnBreak: false,
        status: finalOut ? 'CLOSED' : 'OPEN',
        statusLabel: finalOut ? 'Slutförd' : 'På arbete',
        sortMs: baseMs + 999
      })
    }

    if (rows.length === 0) {
      rows.push({
        rowId: `${entry.id}:fallback`,
        entryId: entry.id,
        name: entry.name,
        type: entry.type,
        personalNumber: entry.personalNumber,
        check_in_at: entry.check_in_at,
        check_in_time_at: normalizeTime(entry.check_in_time_at) ?? toTimePart(entry.check_in_at),
        check_out_at: entry.check_out_at,
        check_out_time_at: normalizeTime(entry.check_out_time_at) ?? toTimePart(entry.check_out_at),
        break: entry.break,
        total_working_seconds: entry.total_working_seconds,
        isOnBreak: entry.isOnBreak,
        status: entry.status,
        statusLabel: entry.isOnBreak ? 'På rast' : entry.check_out_at ? 'Slutförd' : 'På arbete',
        sortMs: baseMs
      })
    }

    return rows
  }

  const sortedEntriesByDay = computed(() => {

    const arr = getArr()

    const sorted = [...arr].sort((a, b) => {
      if (!isWorkEntry(a) || !isWorkEntry(b)) return 0

      const dateA = a.createdAt?.slice(0, 10) ?? ''

      const dateB = b.createdAt?.slice(0, 10) ?? ''

      return dateB.localeCompare(dateA)
    })

    const result: { date: string; dateLabel: string; entries: Entry[] }[] = []

    let currentDay: { date: string; dateLabel: string; entries: Entry[] } | null = null

    for (const entry of sorted) {
      if (!isWorkEntry(entry)) continue

      const date = entry.createdAt?.slice(0, 10) ?? ''

      // Optionally format dateLabel as a more readable string, e.g. 'YYYY-MM-DD' or localized
      const dateLabel = date // You can format this if needed

      if (!currentDay || currentDay.date !== date) {
        currentDay = { date, dateLabel, entries: [] }

        result.push(currentDay)
      }

      currentDay.entries.push(entry)
    }

    result.forEach((day) => {
      day.entries.sort((a, b) => {
        if (!isWorkEntry(a) || !isWorkEntry(b)) return 0

        const aIsOpen = Boolean(a.check_in_at) && !a.check_out_at

        const bIsOpen = Boolean(b.check_in_at) && !b.check_out_at

        // Always keep ongoing entry first in the day list.
        if (aIsOpen !== bIsOpen) {
          return aIsOpen ? -1 : 1
        }

        const activityA = Math.max(toMs(a.updatedAt), toMs(a.check_out_at), toMs(a.check_in_at), toMs(a.createdAt))

        const activityB = Math.max(toMs(b.updatedAt), toMs(b.check_out_at), toMs(b.check_in_at), toMs(b.createdAt))

        if (activityA !== activityB) {
          return activityB - activityA
        }

        const timeA = a.check_in_at || a.createdAt || ''

        const timeB = b.check_in_at || b.createdAt || ''

        return timeB.localeCompare(timeA)
      })
    })

    return result
  })

  const dateRange = computed(() => {
    const arr = getArr()

    if (arr.length === 0) return 'Inga poster'

    const dates = arr
      .map((e) => (isWorkEntry(e) ? e.check_in_at || e.createdAt : undefined))
      .filter((d) => d)
      .map((d) => new Date(d as string))

    if (dates.length === 0) return 'Inga poster'

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))

    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

    return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
  })

  const displayRowsByDay = computed(() => {
    return sortedEntriesByDay.value.map((day) => {
      const rows = day.entries
        .flatMap((entry) => buildDisplayRowsForEntry(entry))
        .sort((a, b) => {
          const aOpen = a.isOnBreak || a.status === 'OPEN'

          const bOpen = b.isOnBreak || b.status === 'OPEN'

          if (aOpen !== bOpen) return aOpen ? -1 : 1

          return b.sortMs - a.sortMs
        })

      return {
        date: day.date,
        dateLabel: day.dateLabel,
        entries: rows
      }
    })
  })

  const totalDisplayRows = computed(() => {
    return displayRowsByDay.value.reduce((sum, day) => sum + day.entries.length, 0)
  })

  return { sortedEntriesByDay, displayRowsByDay, totalDisplayRows, dateRange }
}
