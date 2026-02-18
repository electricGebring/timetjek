<script setup lang="ts">
import { formatWorkTime } from '@/utils/timeFormatters'

const props = defineProps<{
  statusSummary: Record<string, number>
  totalWorkingSeconds: number | null
}>()
</script>

<template>
  <section class="mb-6 grid grid-cols-4 gap-4">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-semibold text-gray-600">ÖPPNA</div>
      <div class="text-2xl font-bold text-blue-600">{{ props.statusSummary.OPEN || 0 }}</div>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-semibold text-gray-600">SLUTFÖRDA</div>
      <div class="text-2xl font-bold text-green-600">{{ props.statusSummary.CLOSED || 0 }}</div>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-semibold text-gray-600">SAKNADE TIDER</div>
      <div class="text-2xl font-bold text-red-600">{{ props.statusSummary.FORGOT_CHECK_OUT || 0 }}</div>
    </div>
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="text-sm font-semibold text-gray-600">TOTALT ARBETAT</div>
      <div class="text-2xl font-bold text-purple-600">{{ formatWorkTime(props.totalWorkingSeconds) }}</div>
    </div>
  </section>
</template>
