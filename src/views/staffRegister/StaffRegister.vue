<script setup lang="ts">
import { ref, onMounted, toRef } from 'vue'

import HeaderBar from '@/components/HeaderBar.vue'

import DebugPanel from '@/components/DebugPanel.vue'

// import { fetchWorkSchemeData } from '@/api/workscheme'
import { useWorkEntriesStore } from '@/stores/work-entries/store'

import { workEntryStatus } from '@/stores/work-entries/constants'

import type { TimeRegistrationStatus } from '@/enums/TimeRegistrationStatus'

// import StatusSummary from '@/components/StatusSummary.vue'
import WorkEntryTable from '@/components/WorkEntryTable.vue'

import StaffRegisterActions from '@/components/StaffRegisterActions.vue'

const store = useWorkEntriesStore()

// import { debugSyncNow } from './debug-sync'
import { formatTime, formatWorkTime, formatBreak } from '@/utils/timeFormatters'

import { createLogger } from '@/utils/logger'

const logger = createLogger('StaffRegister')

import { useWorkEntryList } from '@/composables/useWorkEntryList'

const { sortedEntriesByDay, dateRange } = useWorkEntryList(toRef(store, 'workEntries'))

// Debug panel state (dev mode only)
const debugStatus = ref<string>('')

const debugResult = ref<string[]>([])

const debugLoading = ref(false)

const debugError = ref<string>('')

  const syncTimings = ref<Record<string, number> | undefined>(undefined)

// Typ för window med syncManager
import type { SyncManager } from '@/sync/sync-manager'

interface WindowWithSyncManager extends Window {
  syncManager?: SyncManager
}

function updateSyncTimings() {
  try {
    const syncManager = (window as WindowWithSyncManager).syncManager

    if (!syncManager) {
      
      console.warn('[DebugPanel] No syncManager on window')
      
      return
    }

    // Try common table names
    const possibleTables = ['work_entries', 'staff_register', 'staffregister', 'entries']
    
    let engine = null

    for (const t of possibleTables) {
      engine = syncManager.getSyncEngine?.(t)
      
      if (engine) {
          
        if (engine.lastSyncTimings && Object.keys(engine.lastSyncTimings).length > 0) {
          syncTimings.value = { ...engine.lastSyncTimings }
          
          return
        }
      }
    }

    // If no timings found, clear
    syncTimings.value = undefined
    
    console.warn('[DebugPanel] No timings found for any table')
  } 
  catch (e) {
    console.error('[DebugPanel] updateSyncTimings error', e)
  }
}

onMounted(async () => {
  
  // Patch console.debug to also push logs to debugResult for DebugPanel
  const originalDebug = console.debug
  
  console.debug = function (...args) {
    originalDebug.apply(console, args)
    
    // Only push logs relevant to SyncEngine timing
    if (typeof args[0] === 'string' && args[0].includes('[SyncEngine.start]')) {
      // Special formatting for lastSyncTimings logs
      if (args[0].includes('lastSyncTimings')) {
        let obj = args.find((a) => typeof a === 'object')
        
        if (!obj) obj = {}
        
        debugResult.value.push(`${args[0]} ${JSON.stringify(obj, null, 2)}`)
      } 
      else {
        debugResult.value.push(args.map(String).join(' '))
      }
    }
  }
  
  await store.loadWorkEntries()
  
  await store.loadGroupedWorkEntries()
  // prettier-ignore
  
  ;(window as unknown as { workEntriesData: typeof store.workEntries }).workEntriesData = store.workEntries
  // Listen for sync-completed events and reload data
  
  window.addEventListener('sync-completed', async () => {
    await store.loadWorkEntries()
    
    updateSyncTimings()
  })
  
  // Listen for debug-status events and show debug messages
  window.addEventListener('debug-status', (e: Event) => {
    const customEvent = e as CustomEvent<string>
    
      debugStatus.value = customEvent.detail || ''
  })
  // Fetch timings after initial sync (page load)
  
  setTimeout(updateSyncTimings, 500)
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
import type { WorkEntriesService } from '@/domain/work-entries/service'

const runDebugFunction = async (functionName: string) => {
  debugLoading.value = true

  debugError.value = ''

  debugStatus.value = `Kör ${functionName}...`

  try {
    const service = (window as unknown as { workEntriesService: WorkEntriesService }).workEntriesService

    if (!service) {
      throw new Error('Service inte tillgänglig på window.workEntriesService')
    }

    let result: unknown = null

    switch (functionName) {
      case 'getCurrentStatus':
        result = await service.getCurrentStatus()

        debugStatus.value = `✓ Status hämtad`
        
        debugResult.value = Array.isArray(result)
          ? result.map((r) => JSON.stringify(r, null, 2))
          : [JSON.stringify(result, null, 2)]
        
          break

      case 'getWorkHistory':
        result = await service.getWorkHistory(7)

        debugStatus.value = `✓ Historik hämtad (${(result as unknown[]).length} poster)`
        
        debugResult.value = Array.isArray(result)
          ? result.map((r) => JSON.stringify(r, null, 2))
          : [JSON.stringify(result, null, 2)]
        
        break

      case 'getPendingSyncOperations':
        if (service.getPendingSyncOperations) {
          result = await service.getPendingSyncOperations()

          debugStatus.value = `✓ Väntande sync hämtad (${(result as unknown[]).length} poster)`
          
          debugResult.value = Array.isArray(result)
            ? result.map((r) => JSON.stringify(r, null, 2))
            : [JSON.stringify(result, null, 2)]
        } 
        else {
          debugStatus.value = `Ej implementerat`
          
          debugResult.value = []
        }

        break

      case 'getAllEntries':
        result = await service.getAllEntries()

        debugStatus.value = `✓ Alla entries hämtade (${(result as unknown[]).length} totalt)`
        
        debugResult.value = Array.isArray(result)
          ? result.map((r) => JSON.stringify(r, null, 2))
          : [JSON.stringify(result, null, 2)]

        break
      
        case 'getDatabaseInfo':
        result = await service.getDatabaseInfo()

        debugStatus.value = `✓ Database info hämtad`
        
        debugResult.value = Array.isArray(result)
          ? result.map((r) => JSON.stringify(r, null, 2))
          : [JSON.stringify(result, null, 2)]

        break

      case 'clearAllData':
        if (confirm('VARNING: Detta kommer att ta bort all lokal data. Är du säker?')) {
          await service.clearAllData()

          debugStatus.value = `✓ All data raderad`

          debugResult.value = []

          await store.loadWorkEntries()
        } 
        else {
          debugStatus.value = `Avbruten`
        }

        break
    }

    logger.log(`[DEBUG] ${functionName}:`, result)
    // Uppdatera timings efter varje debug-operation
    
    updateSyncTimings()
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
          <div class="text-2xl font-bold text-blue-600">{{ store.statusSummary['OPEN'] || 0 }}</div>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">SLUTFÖRDA</div>
          <div class="text-2xl font-bold text-green-600">{{ store.statusSummary['CLOSED'] || 0 }}</div>
        </div>
        <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div class="text-sm font-semibold text-gray-600">SAKNADE TIDER</div>
          <div class="text-2xl font-bold text-red-600">{{ store.statusSummary['FORGOT_CHECK_OUT'] || 0 }}</div>
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
          :syncTimings="syncTimings"
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
