<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
// import { fetchWorkSchemeData } from '@/api/workscheme'
import { useStaffRegisterStore } from '@/stores/staff-register/store'
import { workEntryStatus } from '@/stores/staff-register/constants'
import type { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

const store = useStaffRegisterStore()
import { computed } from 'vue'

// Debug panel state (dev mode only)
const debugStatus = ref<string>('')
const debugResult = ref<any>(null)
const debugLoading = ref(false)
const debugError = ref<string>('')
const isDevelopment = process.env.NODE_ENV === 'development'

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

  // Sort entries within each day (newest first based on check_in_at)
  result.forEach((day) => {
    day.entries.sort((a, b) => {
      const timeA = a.check_in_at || a.createdAt || ''
      const timeB = b.check_in_at || b.createdAt || ''
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

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    A: 'bg-blue-50 text-blue-700',
    P: 'bg-purple-50 text-purple-700',
    K: 'bg-red-50 text-red-700',
    V: 'bg-green-50 text-green-700'
  }
  return colors[type] || 'bg-gray-50 text-gray-700'
}

// Format ISO datetime to HH:MM
const formatTime = (isoDateTime: string | null): string => {
  if (!isoDateTime) return '—'
  const date = new Date(isoDateTime)
  const parts = date.toISOString().split('T')
  const timePart = parts[1]
  if (!timePart) return '—'
  const fullTime = timePart.split('.')[0] || '—'
  return fullTime.substring(0, 5) // HH:MM only
}

// Format seconds to "X h Y min" format
const formatWorkTime = (seconds: number | null): string => {
  if (!seconds) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

// Format break time: calculate duration in minutes/hours
const formatBreak = (breakValue: string | null): string => {
  if (!breakValue) return '—'
  
  const parts = breakValue.split('-')
  if (parts.length !== 2) {
    return '—'
  }
  
  const start = parts[0]
  const end = parts[1]
  
  if (!start || !end) return '—'
  
  // If end is 00:00:00, break is ongoing - show nothing
  if (end === '00:00:00') {
    return '—'
  }
  
  // Parse times and calculate duration
  const startParts = start.split(':').map(Number)
  const endParts = end.split(':').map(Number)
  
  const startH = startParts[0] ?? 0
  const startM = startParts[1] ?? 0
  const startS = startParts[2] ?? 0
  const endH = endParts[0] ?? 0
  const endM = endParts[1] ?? 0
  const endS = endParts[2] ?? 0
  
  const startMinutes = startH * 60 + startM + startS / 60
  const endMinutes = endH * 60 + endM + endS / 60
  const durationMinutes = Math.round(endMinutes - startMinutes)
  
  // Always show duration, even if 0
  if (durationMinutes < 60) {
    return `${durationMinutes}min`
  }
  
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  
  if (minutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${minutes}min`
}

const isProcessing = ref(false)

const getWorkEntryStatus = (status: any): { text: string; icon: string; class: string } | null => {
  if (!status || typeof status !== 'string') return null
  const statusKey = status as TimeRegistrationStatus
  return workEntryStatus[statusKey] || null
}

const handleCheckIn = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    await store.checkIn(work_day_id)
  } catch (e: any) {
    alert(e.message || 'Instämpling misslyckades')
    console.error('Check-in failed:', e)
  } finally {
    isProcessing.value = false
  }
}

const handleCheckOut = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    await store.checkOut(work_day_id)
  } catch (e: any) {
    alert(e.message || 'Utstämpling misslyckades')
    console.error('Check-out failed:', e)
  } finally {
    isProcessing.value = false
  }
}

const handleBreak = async () => {
  if (isProcessing.value) return
  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))
    await store.goOnBreak(work_day_id)
  } catch (e: any) {
    alert(e.message || 'Gå på rast misslyckades')
    console.error('Break failed:', e)
  } finally {
    isProcessing.value = false
  }
}

// Debug functions
const runDebugFunction = async (functionName: string, args?: any) => {
  debugLoading.value = true
  debugError.value = ''
  debugStatus.value = `Kör ${functionName}...`
  
  try {
    const service = (window as any).staffRegisterService
    if (!service) {
      throw new Error('Service inte tillgänglig på window.staffRegisterService')
    }
    
    let result
    switch (functionName) {
      case 'getCurrentStatus':
        result = await service.getCurrentStatus()
        debugStatus.value = `✓ Status hämtad`
        debugResult.value = result
        break
      case 'getWorkHistory':
        result = await service.getWorkHistory(7)
        debugStatus.value = `✓ Historik hämtad (${result.length} poster)`
        debugResult.value = result
        break
      case 'getEntriesForDate':
        const today = new Date().toISOString().split('T')[0]
        result = await service.getEntriesForDate(today)
        debugStatus.value = `✓ Dagens poster (${result.length} stycken)`
        debugResult.value = result
        break
      case 'getPendingSyncOperations':
        result = await service.getPendingSyncOperations()
        debugStatus.value = `✓ Väntande sync (${result.length} operationer)`
        debugResult.value = result
        break
      case 'clearAllData':
        if (confirm('VARNING: Detta kommer att ta bort all lokal data. Är du säker?')) {
          await service.clearAllData()
          debugStatus.value = `✓ All data raderad`
          debugResult.value = null
          await store.loadWorkEntries()
        } else {
          debugStatus.value = `Avbruten`
        }
        break
    }
    
    console.log(`[DEBUG] ${functionName}:`, result)
  } catch (e: any) {
    debugError.value = e.message || 'Okänt fel'
    debugStatus.value = `✗ Fel`
    console.error(`[DEBUG ERROR] ${functionName}:`, e)
  } finally {
    debugLoading.value = false
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

      <!-- Status summary -->
      <section class="mb-6 grid grid-cols-4 gap-4">
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">ÖPPNA</div>
          <div class="text-2xl font-bold text-blue-600">{{ store.statusSummary.OPEN || 0 }}</div>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">SLUTFÖRDA</div>
          <div class="text-2xl font-bold text-green-600">{{ store.statusSummary.CLOSED || 0 }}</div>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">SAKNADE TIDER</div>
          <div class="text-2xl font-bold text-red-600">{{ store.statusSummary.FORGOT_CHECK_OUT || 0 }}</div>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">TOTALT ARBETAT</div>
          <div class="text-2xl font-bold text-purple-600">{{ formatWorkTime(store.totalWorkingSeconds) }}</div>
        </div>
      </section>

      <!-- Debug panel (dev mode only) -->
      <section v-if="isDevelopment" class="mb-6 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-6">
        <div class="mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon="bug" class="text-2xl text-yellow-600" />
          <h2 class="text-xl font-bold text-yellow-700">Debug Panel</h2>
        </div>
        
        <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <button
            @click="runDebugFunction('getCurrentStatus')"
            :disabled="debugLoading"
            class="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Status
          </button>
          <button
            @click="runDebugFunction('getWorkHistory')"
            :disabled="debugLoading"
            class="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            Historik (7d)
          </button>
          <button
            @click="runDebugFunction('getEntriesForDate')"
            :disabled="debugLoading"
            class="rounded-lg bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
          >
            Idag
          </button>
          <button
            @click="runDebugFunction('getPendingSyncOperations')"
            :disabled="debugLoading"
            class="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            Väntande Sync
          </button>
          <button
            @click="runDebugFunction('clearAllData')"
            :disabled="debugLoading"
            class="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            Rensa Data
          </button>
        </div>
        
        <div v-if="debugStatus" class="text-sm font-semibold text-yellow-700">
          {{ debugStatus }}
        </div>
        <div v-if="debugError" class="mt-2 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-700">
          Fel: {{ debugError }}
        </div>
        <div v-if="debugResult" class="mt-4">
          <details class="rounded-lg bg-white p-3">
            <summary class="cursor-pointer font-semibold text-gray-700">Resultat (klicka för att expandera)</summary>
            <pre class="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-100 p-2 text-xs text-gray-800">{{ JSON.stringify(debugResult, null, 2) }}</pre>
          </details>
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
                  <td class="px-5 py-4 text-gray-900">{{ formatTime(entry.check_in_at) }}</td>
                  <td class="px-5 py-4">
                    <span
                      v-if="entry.check_out_at"
                      class="text-gray-900"
                      >{{ formatTime(entry.check_out_at) }}</span
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
                      >{{ formatBreak(entry.break) }}</span
                    >
                    <span
                      v-else
                      class="text-gray-400"
                      >&mdash;</span
                    >
                  </td>
                  <td class="px-5 py-4">
                    <span
                      v-if="entry.total_working_seconds"
                      class="text-gray-900"
                      >{{ formatWorkTime(entry.total_working_seconds) }}</span
                    >
                    <span
                      v-else
                      class="text-gray-400"
                      >&mdash;</span
                    >
                  </td>
                  <td class="px-5 py-4">
                    <div v-if="entry.break" class="flex items-center gap-2 font-semibold text-orange-600">
                      {{ entry.check_out_at ? 'Rast' : 'På rast' }}
                    </div>
                    <div
                      v-else-if="getWorkEntryStatus(entry.status)"
                      class="flex items-center gap-2"
                    >
                      <FontAwesomeIcon 
                        :icon="getWorkEntryStatus(entry.status)!.icon" 
                        :class="getWorkEntryStatus(entry.status)!.class" 
                      />
                      <span :class="getWorkEntryStatus(entry.status)!.class" class="font-semibold">
                        {{ getWorkEntryStatus(entry.status)!.text }}
                      </span>
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
