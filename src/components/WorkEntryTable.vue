<template>
  <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="bg-gray-100 text-gray-700">
            <th class="px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm">NAMN</th>
            <th class="px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm">TYP</th>
            <th class="hidden px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm lg:table-cell">
              P.NR
            </th>
            <th class="px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm">TID IN</th>
            <th class="px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm">TID UT</th>
            <th class="hidden px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm md:table-cell">
              RAST
            </th>
            <th class="px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm">ARBETSTID</th>
            <th class="hidden px-3 py-3 text-left text-xs font-semibold sm:px-5 sm:py-4 sm:text-sm md:table-cell">
              INFO
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <template
            v-for="day in safeEntriesByDay"
            :key="day.date"
          >
            <tr>
              <td
                colspan="8"
                class="border-b border-gray-200 bg-gray-50 px-3 py-3 text-base font-bold text-gray-800 sm:px-5 sm:text-lg"
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
              <td class="px-3 py-3 sm:px-5 sm:py-4">
                <a
                  href="#"
                  class="font-semibold text-blue-600 hover:underline"
                  >{{ entry.name }}</a
                >
              </td>
              <td class="px-3 py-3 sm:px-5 sm:py-4">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold"
                  :class="getTypeColor(entry.type)"
                  >{{ entry.type }}</span
                >
              </td>
              <td class="hidden px-3 py-3 text-gray-900 sm:px-5 sm:py-4 lg:table-cell">{{ entry.personalNumber }}</td>
              <td class="px-3 py-3 text-gray-900 sm:px-5 sm:py-4">{{ formatTime(entry.check_in_at) }}</td>
              <td class="px-3 py-3 sm:px-5 sm:py-4">
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
              <td class="hidden px-3 py-3 sm:px-5 sm:py-4 md:table-cell">
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
              <td class="px-3 py-3 sm:px-5 sm:py-4">
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
              <td class="hidden px-3 py-3 sm:px-5 sm:py-4 md:table-cell">
                <div
                  v-if="entry.isOnBreak ?? entry.break?.endsWith('-')"
                  class="flex items-center gap-2 font-semibold text-orange-600"
                >
                  På rast
                </div>
                <div
                  v-else-if="getWorkEntryStatus(entry.status)"
                  class="flex items-center gap-2"
                >
                  <FontAwesomeIcon
                    :icon="getWorkEntryStatus(entry.status)!.icon"
                    :class="getWorkEntryStatus(entry.status)!.class"
                  />
                  <span
                    :class="getWorkEntryStatus(entry.status)!.class"
                    class="font-semibold"
                  >
                    {{ getWorkEntryStatus(entry.status)!.text }}
                  </span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
      <span class="text-sm text-gray-700">Totalt: {{ totalEntries }} tider</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import type { PropType } from 'vue'

import type { Entry } from '@/views/staffRegister/types'

const props = defineProps({
  entriesByDay: {
    type: Array as PropType<Array<{ date: string; dateLabel: string; entries: unknown[] }>>,
    required: true
  },
  totalEntries: {
    type: Number,
    required: true
  },
  formatTime: {
    type: Function as PropType<(isoDateTime: string | null) => string>,
    required: true
  },
  formatWorkTime: {
    type: Function as PropType<(seconds: number | null) => string>,
    required: true
  },
  formatBreak: {
    type: Function as PropType<(breakValue: string | null) => string>,
    required: true
  },
  getWorkEntryStatus: {
    type: Function as PropType<(status: unknown) => { text: string; icon: string; class: string } | null>,
    required: true
  },
  getTypeColor: {
    type: Function as PropType<(type: string) => string>,
    required: true
  }
})

// Type guard for Entry
function isEntry(entry: unknown): entry is Entry {
  return typeof entry === 'object' && entry !== null && 'id' in entry && 'name' in entry && 'type' in entry
}

const safeEntriesByDay = computed(() => {
  return (props.entriesByDay as Array<{ date: string; dateLabel: string; entries: unknown[] }>).map((day) => ({
    ...day,
    entries: day.entries.filter(isEntry) as Entry[]
  }))
})
</script>
