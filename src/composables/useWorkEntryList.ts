import { computed, type Ref } from 'vue'

import type { Entry } from '@/views/staffRegister/types'

export function useWorkEntryList(workEntries: Ref<Entry[]>) {

  const getArr = () => (Array.isArray(workEntries.value) ? workEntries.value : [])

  // Type guard for work entry objects
  function isWorkEntry(obj: unknown): obj is Entry {
    return typeof obj === 'object' && obj !== null && 'id' in obj && 'createdAt' in obj
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

  return { sortedEntriesByDay, dateRange }
}
