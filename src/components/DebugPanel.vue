<script setup lang="ts">
import { debugSyncNow } from '@/views/staffRegister/debug-sync'

import { ref, watch } from 'vue'

const props = defineProps<{
  debugStatus: string
  debugResult: unknown
  debugLoading: boolean
  debugError: string
  runDebugFunction: (fn: string) => void
  syncTimings?: Record<string, number>
}>()

const showTimings = ref(false)

// Auto-collapse timings if they disappear, expand if new timings arrive
watch(() => props.syncTimings, (val, oldVal) => {
  if (val && val !== oldVal) showTimings.value = true
  
  if (!val) showTimings.value = false
})
</script>

<template>
  <section class="mb-6 rounded-lg border-2 border-yellow-400 bg-yellow-50 p-6">
    <div class="mb-4 flex items-center gap-2">
      <FontAwesomeIcon
        icon="bug"
        class="text-2xl text-yellow-600"
      />
      <h2 class="text-xl font-bold text-yellow-700">Debug Panel</h2>
    </div>
    
    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <button
        @click="props.runDebugFunction('getCurrentStatus')"
        :disabled="props.debugLoading"
        class="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Status
      </button>
      <button
        @click="props.runDebugFunction('getWorkHistory')"
        :disabled="props.debugLoading"
        class="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white
               hover:bg-green-600 disabled:opacity-50"
      >
        Historik (7d)
      </button>
      <button
        @click="props.runDebugFunction('getPendingSyncOperations')"
        :disabled="props.debugLoading"
        class="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white
               hover:bg-orange-600 disabled:opacity-50"
      >
        Väntande Sync
      </button>
      <button
        @click="props.runDebugFunction('getAllEntries')"
        :disabled="props.debugLoading"
        class="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        Alla Entries
      </button>
      <button
        @click="props.runDebugFunction('getDatabaseInfo')"
        :disabled="props.debugLoading"
        class="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white
               hover:bg-indigo-600 disabled:opacity-50"
      >
        DB Info
      </button>
      <button
        @click="debugSyncNow"
        :disabled="props.debugLoading"
        class="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Synk
      </button>
    </div>
    <div
      v-if="props.debugStatus"
      class="text-sm font-semibold text-yellow-700"
    >
      {{ props.debugStatus }}
    </div>
    <div
      v-if="props.debugError"
      class="mt-2 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-700"
    >
      Fel: {{ props.debugError }}
    </div>
    <div v-if="props.syncTimings && Object.keys(props.syncTimings).length" class="mb-2 text-xs text-gray-700">
      <details :open="showTimings">
        <summary class="cursor-pointer font-semibold text-gray-700">Sync timings (klicka för att expandera)</summary>
        <ul class="ml-5 mt-1 list-disc">
          <li v-for="(value, key) in props.syncTimings" :key="key">
            <span class="font-mono">{{ key }}: {{ value }} ms</span>
          </li>
        </ul>
      </details>
    </div>
  </section>
</template>
