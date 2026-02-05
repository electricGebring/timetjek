<script setup lang="ts">
function formatUpdatedAt(updatedAt: string | number | null | undefined): string {
  if (!updatedAt) return ''
  let date: Date
  if (typeof updatedAt === 'string') {
    // If string is a number (possibly with decimal), treat as timestamp
    if (/^\d+(\.\d+)?$/.test(updatedAt)) {
      date = new Date(parseFloat(updatedAt))
    } else {
      date = new Date(updatedAt)
    }
  } else if (typeof updatedAt === 'number') {
    date = new Date(updatedAt)
  } else {
    return ''
  }
  // Format as YYYY-MM-DD HH:mm:ss
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
import { ref, onMounted } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
// import { fetchWorkSchemeData } from '@/api/workscheme'
import { useStaffRegisterStore } from '@/stores/staff-register/store'

const store = useStaffRegisterStore()
import { computed } from 'vue'

const sortedEntriesByDay = computed(() => {
  const sorted = [...store.workEntries].sort((a, b) => {
    // Sort by date (newest first)
    const dateA = (a.date || a.createdAt?.slice(0, 10)) ?? ''
    const dateB = (b.date || b.createdAt?.slice(0, 10)) ?? ''
    return dateB.localeCompare(dateA) // descending
  })

  const result: { date: string; dateLabel: string; entries: any[] }[] = []
  let currentDay: { date: string; dateLabel: string; entries: any[] } | null = null

  for (const entry of sorted) {
    const date = entry.date || entry.createdAt?.slice(0, 10)
    const dateLabel = entry.dateLabel || date
    if (!currentDay || currentDay.date !== date) {
      currentDay = { date, dateLabel, entries: [] }
      result.push(currentDay)
    }
    currentDay.entries.push(entry)
  }

  // Sort entries within each day (newest first based on timeIn)
  result.forEach((day) => {
    day.entries.sort((a, b) => {
      const timeA = a.timeIn || a.createdAt || ''
      const timeB = b.timeIn || b.createdAt || ''
      return timeB.localeCompare(timeA) // newest first
    })
  })

  return result
})


onMounted(async () => {
  await store.loadWorkEntries()
  await store.loadGroupedWorkEntries()
  ;(window as any).staffRegisterData = store.workEntries

  // Listen for sync-completed events and reload data
  window.addEventListener('sync-completed', async () => {
    await store.loadWorkEntries()
  })
})

const getStatusColor = (statusType: string) => {
  switch (statusType) {
    case 'working':
      return 'text-green-600'
    case 'break':
      return 'text-orange-600'
    case 'updated':
      return 'text-blue-700'
    case 'deleted':
      return 'text-red-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-gray-900'
  }
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    A: 'bg-blue-50 text-blue-700',
    P: 'bg-purple-50 text-purple-700',
    K: 'bg-red-50 text-red-700',
    V: 'bg-green-50 text-green-700'
  }
  return colors[type] || 'bg-gray-50 text-gray-700'
}

const isProcessing = ref(false)

// ...existing code...
const formatMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours} tim ${minutes} min`
  if (hours > 0) return `${hours} tim`
  return `${minutes} min`
}

const handleCheckIn = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    const now = new Date()
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    const isoDate = now.toISOString()
    const timeIn = now.toTimeString().slice(0, 8)

    const todaysEntries = store.workEntries.filter((e) => e.work_day_id === work_day_id)

    // 1) If a break entry is open, close it first
    const openBreak = todaysEntries
      .filter((e) => e.status === 'Rast' && e.timeIn && !e.timeOut)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]

    if (openBreak) {
      const breakInParts = openBreak.timeIn.split(':')
      const breakOutParts = timeIn.split(':')
      const breakInMinutes = parseInt(breakInParts[0] || '0') * 60 + parseInt(breakInParts[1] || '0')
      const breakOutMinutes = parseInt(breakOutParts[0] || '0') * 60 + parseInt(breakOutParts[1] || '0')
      const breakMinutes = breakOutMinutes - breakInMinutes

      await store.updateWorkEntry({
        ...openBreak,
        timeOut: timeIn,
        break: formatMinutes(breakMinutes),
        status: 'Rast',
        statusType: 'break',
        updatedAt: isoDate
      })
    }

    // 2) Create a new work entry
    await store.addWorkEntryWithDefaults({
      name: 'Anna Svensson',
      type: 'A',
      personalNumber: '19870312-1234',
      work_day_id,
      timeIn,
      status: 'På arbete',
      statusType: 'working',
      createdAt: isoDate,
      updatedAt: isoDate
    })

    await store.loadWorkEntries()
  } catch (e: any) {
    alert(e.message || 'Instämpling misslyckades')
    console.error('Check-in failed:', e.message)
  } finally {
    isProcessing.value = false
  }
}

const handleCheckOut = async () => {
  try {
    const now = new Date()
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    const todaysEntries = store.workEntries.filter((e) => e.work_day_id === work_day_id)

    const openEntry = todaysEntries
      .filter((e) => e.timeIn && !e.timeOut)
      .sort((a, b) => {
        const timeA = a.createdAt || ''
        const timeB = b.createdAt || ''
        return timeB.localeCompare(timeA)
      })[0]

    if (!openEntry) {
      alert('Ingen öppen instämpling hittades')
      return
    }

    const timeOut = now.toTimeString().slice(0, 8)
    const isoDate = now.toISOString()

    const timeInParts = openEntry.timeIn.split(':')
    const timeOutParts = timeOut.split(':')
    const timeInMinutes = parseInt(timeInParts[0]) * 60 + parseInt(timeInParts[1])
    const timeOutMinutes = parseInt(timeOutParts[0]) * 60 + parseInt(timeOutParts[1])
    const workTimeMinutes = timeOutMinutes - timeInMinutes

    const updatedEntry = {
      ...openEntry,
      timeOut,
      workTime: formatMinutes(workTimeMinutes),
      status: null,
      statusType: 'updated',
      updatedAt: isoDate
    }

    await store.updateWorkEntry(updatedEntry)
    await store.loadWorkEntries()
  } catch (e: any) {
    alert(e.message || 'Utstämpling misslyckades')
    console.error('Check-out failed:', e.message)
  }
}

const handleBreak = async () => {
  try {
    const now = new Date()
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    const isoDate = now.toISOString()
    const timeOut = now.toTimeString().slice(0, 8)

    const todaysEntries = store.workEntries.filter((e) => e.work_day_id === work_day_id)

    // If a break is already open, do nothing
    const openBreak = todaysEntries.find((e) => e.status === 'Rast' && e.timeIn && !e.timeOut)
    if (openBreak) {
      alert('Du är redan på rast')
      return
    }

    // 1) Close the open work entry (if any)
    const openWork = todaysEntries
      .filter((e) => e.timeIn && !e.timeOut && e.status !== 'Rast')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]

    if (!openWork) {
      // NEW: allow break without open check-in
      await store.addWorkEntryWithDefaults({
        name: 'Anna Svensson',
        type: 'A',
        personalNumber: '19870312-1234',
        work_day_id,
        timeIn: timeOut,
        status: 'Rast',
        statusType: 'break',
        createdAt: isoDate,
        updatedAt: isoDate
      })

      await store.loadWorkEntries()
      return
    }

    const timeInParts = openWork.timeIn.split(':')
    const timeOutParts = timeOut.split(':')
    const timeInMinutes = parseInt(timeInParts[0]) * 60 + parseInt(timeInParts[1])
    const timeOutMinutes = parseInt(timeOutParts[0]) * 60 + parseInt(timeOutParts[1])
    const workTimeMinutes = timeOutMinutes - timeInMinutes

    await store.updateWorkEntry({
      ...openWork,
      timeOut,
      workTime: workTimeMinutes,
      status: null,
      statusType: 'updated',
      updatedAt: isoDate
    })

    // 2) Create new break entry
    await store.addWorkEntryWithDefaults({
      name: 'Anna Svensson',
      type: 'A',
      personalNumber: '19870312-1234',
      work_day_id,
      timeIn: timeOut,
      status: 'Rast',
      statusType: 'break',
      createdAt: isoDate,
      updatedAt: isoDate
    })

    await store.loadWorkEntries()
  } catch (e: any) {
    alert(e.message || 'Gå på rast misslyckades')
    console.error('Break failed:', e.message)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <HeaderBar/>

    <main class="mx-auto max-w-6xl px-8 py-6">
      <!-- Breadcrumbs -->
      <nav
        aria-label="Brödsmulor"
        class="mb-5 flex items-center gap-2 text-sm text-gray-600"
      >
        <a
          href="#"
          class="text-blue-600 hover:underline"
          >Företag</a
        >
        <span class="text-gray-400">/</span>
        <a
          href="#"
          class="text-blue-600 hover:underline"
          >Identifiera</a
        >
        <span class="text-gray-400">/</span>
        <span class="font-semibold text-gray-800">Personalliggare</span>
      </nav>

      <!-- Title + actions -->
      <section class="mb-6 flex items-start justify-between gap-6">
        <div class="flex items-center gap-4">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm"
            aria-hidden="true"
          >
            <FontAwesomeIcon
              icon="clipboard-list"
              class="text-xl"
            />
          </span>
          <h1 class="text-4xl font-extrabold tracking-tight text-gray-900">Personalliggare</h1>
        </div>

        <div
          role="group"
          aria-label="Åtgärder"
          class="flex gap-4"
        >
          <button
            type="button"
            @click="handleCheckIn"
            :disabled="isProcessing"
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="clock"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Stämpla in</span>
          </button>
          <button
            type="button"
            @click="handleCheckOut"
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="arrow-right-from-bracket"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Stämpla ut</span>
          </button>
          <button
            type="button"
            @click="handleBreak"
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="mug-saucer"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Gå på rast</span>
          </button>
        </div>
      </section>

      <!-- Filters row -->
      <section class="mb-6 flex items-center justify-between gap-6">
        <!-- Filter/info row, can be customized or removed -->
        <div class="flex h-16 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 shadow-sm">
          <FontAwesomeIcon
            icon="calendar-days"
            class="text-lg text-gray-700"
          />
          <div class="font-semibold whitespace-nowrap text-gray-900">Arbetsperiod</div>
        </div>
        <div class="flex flex-1 items-center gap-10"></div>
        <button
          type="button"
          aria-label="Filter"
          class="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
        >
          <FontAwesomeIcon
            icon="filter"
            class="text-gray-700"
          />
        </button>
      </section>

      <!-- Table -->
      <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-gray-100 text-gray-700">
                <th class="px-5 py-4 text-left font-semibold">NAMN</th>
                <th class="px-5 py-4 text-left font-semibold">TYP</th>
                <th class="px-5 py-4 text-left font-semibold">P.NR</th>
                <th class="px-5 py-4 text-left font-semibold">TID IN</th>
                <th class="px-5 py-4 text-left font-semibold">TID UT</th>
                <th class="px-5 py-4 text-left font-semibold">RAST</th>
                <th class="px-5 py-4 text-left font-semibold">ARBETSTID</th>
                <th class="px-5 py-4 text-left font-semibold">INFO</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <template
                v-for="day in sortedEntriesByDay"
                :key="day.date"
              >
                <tr>
                  <td
                    colspan="8"
                    class="border-b border-gray-200 bg-gray-50 px-5 py-3 text-lg font-bold text-gray-800"
                  >
                    <span>{{ day.dateLabel }}</span>
                    <span
                      v-if="day.date"
                      class="ml-2 text-base font-normal text-gray-500"
                      >{{ day.date }}</span
                    >
                  </td>
                </tr>
                <tr
                  v-for="entry in day.entries"
                  :key="entry.id"
                  class="bg-white"
                >
                  <td class="px-5 py-4">
                    <a
                      href="#"
                      class="font-semibold text-blue-600 hover:underline"
                      >{{ entry.name }}</a
                    >
                  </td>
                  <td class="px-5 py-4">
                    <span
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold"
                      :class="getTypeColor(entry.type)"
                      >{{ entry.type }}</span
                    >
                  </td>
                  <td class="px-5 py-4 text-gray-900">{{ entry.personalNumber }}</td>
                  <td class="px-5 py-4 text-gray-900">{{ entry.timeIn }}</td>
                  <td class="px-5 py-4">
                    <span
                      v-if="entry.timeOut"
                      class="text-gray-900"
                      >{{ entry.timeOut }}</span
                    >
                    <span
                      v-else
                      class="text-gray-400"
                      >&mdash;</span
                    >
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="entry.break"
                      class="text-gray-900"
                      >{{ entry.break }}</span
                    >
                    <span
                      v-else
                      class="text-gray-400"
                      >&mdash;</span
                    >
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="entry.workTime"
                      class="text-gray-900"
                      >{{ entry.workTime }}</span
                    >
                    <span
                      v-else
                      class="text-gray-400"
                      >&mdash;</span
                    >
                  </td>
                  <td class="px-5 py-4">
                    <div v-if="entry.hasError">
                      <span
                        class="inline-flex items-center gap-2 font-semibold"
                        :class="getStatusColor(entry.statusType)"
                      >
                        <FontAwesomeIcon
                          icon="circle-exclamation"
                          class="text-red-600"
                        />
                        {{ entry.status }}
                      </span>
                    </div>
                    <div
                      v-else-if="entry.status"
                      :class="getStatusColor(entry.statusType)"
                    >
                      <div class="font-semibold">{{ entry.status }}</div>
                      <div
                        v-if="entry.updatedBy"
                        class="text-xs text-gray-500"
                      >
                        av {{ entry.updatedBy }} {{ formatUpdatedAt(entry.updatedAt) }}
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination (optional, not functional here) -->
        <div class="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
          <span class="text-sm text-gray-700">Totalt: {{ store.workEntries.length }} tider</span>
        </div>
      </section>
    </main>
  </div>
</template>
