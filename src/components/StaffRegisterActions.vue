<template>
  <section class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
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
      class="flex flex-wrap gap-3 lg:justify-end"
    >
      <button
        type="button"
        @click="onCheckIn"
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
        @click="onCheckOut"
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
        @click="onBreak"
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
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import type { PropType } from 'vue'

defineProps({
  isProcessing: Boolean,
  onCheckIn: {
    type: Function as PropType<() => void>,
    required: true
  },
  onCheckOut: {
    type: Function as PropType<() => void>,
    required: true
  },
  onBreak: {
    type: Function as PropType<() => void>,
    required: true
  }
})
</script>
