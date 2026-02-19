import { computed, type Ref } from 'vue'

export function useWorkEntryList(workEntries: Ref<unknown[]>) {
  const getArr = () => (Array.isArray(workEntries.value) ? workEntries.value : [])

  const sortedEntriesByDay = computed(() => {
    const arr = getArr()

    const sorted = [...arr].sort((a, b) => {
      const dateA = (a.date || a.createdAt?.slice(0, 10)) ?? ''

      const dateB = (b.date || b.createdAt?.slice(0, 10)) ?? ''

      return dateB.localeCompare(dateA)
    })

    const result: { date: string; dateLabel: string; entries: unknown[] }[] = []

    let currentDay: { date: string; dateLabel: string; entries: unknown[] } | null = null

    for (const entry of sorted) {
      const date = entry.date || entry.createdAt?.slice(0, 10)

      const dateLabel = entry.dateLabel || date

      if (!currentDay || currentDay.date !== date) {
        currentDay = { date, dateLabel, entries: [] }

        result.push(currentDay)
      }

      currentDay.entries.push(entry)
    }

    result.forEach((day) => {
      day.entries.sort((a, b) => {
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
      .map((e) => e.check_in_at || e.createdAt)
      .filter((d) => d)
      .map((d) => new Date(d))

    if (dates.length === 0) return 'Inga poster'

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))

    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

    const formatDate = (date: Date) => {
      const day = date.getDate()

      const month = date.getMonth() + 1

      const year = date.getFullYear()

      return `${day}/${month}/${year}`
    }

    if (minDate.toDateString() === maxDate.toDateString()) {
      return `${formatDate(minDate)}`
    }

    return `${formatDate(minDate)} - ${formatDate(maxDate)}`
  })

  return { sortedEntriesByDay, dateRange }
}
