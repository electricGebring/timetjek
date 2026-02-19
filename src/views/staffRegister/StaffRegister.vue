<script setup lang="ts">
import { ref, onMounted, toRef } from 'vue'

import HeaderBar from '@/components/HeaderBar.vue'

import DebugPanel from '@/components/DebugPanel.vue'

// import { fetchWorkSchemeData } from '@/api/workscheme'
import { useStaffRegisterStore } from '@/stores/staff-register/store'

import { workEntryStatus } from '@/stores/staff-register/constants'

import type { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

// import StatusSummary from '@/components/StatusSummary.vue'
import WorkEntryTable from '@/components/WorkEntryTable.vue'

import StaffRegisterActions from '@/components/StaffRegisterActions.vue'

const store = useStaffRegisterStore()

// import { debugSyncNow } from './debug-sync'
import { formatTime, formatWorkTime, formatBreak } from '@/utils/timeFormatters'

import { createLogger } from '@/utils/logger'

const logger = createLogger('StaffRegister')

import { useWorkEntryList } from '@/composables/useWorkEntryList'

const { sortedEntriesByDay, dateRange } = useWorkEntryList(toRef(store, 'workEntries'))

// Debug panel state (dev mode only)
const debugStatus = ref<string>('')

const debugResult = ref<unknown>(null)

const debugLoading = ref(false)

const debugError = ref<string>('')

onMounted(async () => {
  await store.loadWorkEntries()

  await store.loadGroupedWorkEntries()

  // prettier-ignore
  ;(window as unknown as { staffRegisterData: typeof store.workEntries }).staffRegisterData = store.workEntries

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
// ...existing code...

const isProcessing = ref(false)

const getWorkEntryStatus = (status: unknown): { text: string; icon: string; class: string } | null => {
  if (!status || typeof status !== 'string') return null

  const statusKey = status as TimeRegistrationStatus

  return workEntryStatus[statusKey] || null
}

const handleCheckIn = async () => {
  if (isProcessing.value) return

  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))

    const traceId = Math.random().toString(36).slice(2, 8)

    logger.log(`[1. UI] 🎬 CheckIn started - ${traceId}`, { work_day_id })

    await store.checkIn(work_day_id)
  }
 catch (e: unknown) {
    alert((e as Error).message || 'Instämpling misslyckades')

    console.error('Check-in failed:', e)
  }
 finally {
    isProcessing.value = false
  }
}

const handleCheckOut = async () => {
  if (isProcessing.value) return

  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))

    await store.checkOut(work_day_id)
  }
 catch (e: unknown) {
    alert((e as Error).message || 'Utstämpling misslyckades')

    console.error('Check-out failed:', e)
  }
 finally {
    isProcessing.value = false
  }
}

const handleBreak = async () => {
  if (isProcessing.value) return

  isProcessing.value = true

  try {
    const work_day_id = Number(new Date().setHours(0, 0, 0, 0))

    await store.goOnBreak(work_day_id)
  }
 catch (e: unknown) {
    alert((e as Error).message || 'Gå på rast misslyckades')

    console.error('Break failed:', e)
  }
 finally {
    isProcessing.value = false
  }
}

// Debug functions
const runDebugFunction = async (functionName: string) => {
  debugLoading.value = true

  debugError.value = ''

  debugStatus.value = `Kör ${functionName}...`

  try {
    const service = (window as unknown as { staffRegisterService: unknown }).staffRegisterService

    if (!service) {
      throw new Error('Service inte tillgänglig på window.staffRegisterService')
    }

    let result: unknown

    switch (functionName) {
      case 'getCurrentStatus':
        result = await (service as { getCurrentStatus: () => Promise<unknown> }).getCurrentStatus()

        debugStatus.value = `✓ Status hämtad`

        debugResult.value = result

        break

      case 'getWorkHistory':
        result = await service.getWorkHistory(7)

        debugStatus.value = `✓ Historik hämtad (${result.length} poster)`

        debugResult.value = result

        break

      case 'getPendingSyncOperations':
        result = await service.getPendingSyncOperations()

        debugStatus.value = `✓ Väntande sync (${result.length} operationer)`

        debugResult.value = result

        break

      case 'getAllEntries':
        result = await service.getAllEntries()

        debugStatus.value = `✓ Alla entries hämtade (${result.length} totalt)`

        debugResult.value = result

        break

      case 'getDatabaseInfo':
        result = await service.getDatabaseInfo()

        debugStatus.value = `✓ Database info hämtad`

        debugResult.value = result

        break

      case 'clearAllData':
        if (confirm('VARNING: Detta kommer att ta bort all lokal data. Är du säker?')) {
          await service.clearAllData()

          debugStatus.value = `✓ All data raderad`

          debugResult.value = null

          await store.loadWorkEntries()
        }
 else {
          debugStatus.value = `Avbruten`
        }

        break
    }

    logger.info(`[DEBUG] ${functionName}:`, result)
  }
 catch (e: unknown) {
    debugError.value = (e as Error).message || 'Okänt fel'

    debugStatus.value = `✗ Fel`

    console.error(`[DEBUG ERROR] ${functionName}:`, e)
  }
 finally {
    debugLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <HeaderBar />

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
      <StaffRegisterActions
        :is-processing="isProcessing"
        :on-check-in="handleCheckIn"
        :on-check-out="handleCheckOut"
        :on-break="handleBreak"
      />

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

      <!-- Debug panel -->
      <section class="mb-6">
        <DebugPanel
          :debugStatus="debugStatus"
          :debugResult="debugResult"
          :debugLoading="debugLoading"
          :debugError="debugError"
          :runDebugFunction="runDebugFunction"
        />
      </section>

      <!-- Filters row -->
      <section class="mb-6">
        <div class="inline-flex h-16 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 shadow-sm">
          <FontAwesomeIcon
            icon="calendar-days"
            class="text-lg text-gray-700"
          />
          <div class="flex flex-col">
            <div class="text-xs text-gray-500">Arbetsperiod</div>
            <div class="font-semibold whitespace-nowrap text-gray-900">{{ dateRange }}</div>
          </div>
        </div>
      </section>

      <WorkEntryTable
        :entries-by-day="sortedEntriesByDay"
        :total-entries="store.workEntries.length"
        :format-time="formatTime"
        :format-work-time="formatWorkTime"
        :format-break="formatBreak"
        :get-work-entry-status="getWorkEntryStatus"
        :get-type-color="getTypeColor"
      />
    </main>
  </div>
</template>
