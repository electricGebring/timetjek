<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  headerDate: { type: String, default: '' },
  headerTime: { type: String, default: '' }
})

const now = ref(new Date())

let timerId: number | undefined

let tempTimerId: number | undefined

const formatHeaderDate = (date: Date) => {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const formatHeaderTime = (date: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)

const displayDate = computed(() => props.headerDate || formatHeaderDate(now.value))

const displayTime = computed(() => props.headerTime || formatHeaderTime(now.value))

const temperature = ref<number | null>(null)

const displayTemperature = computed(() => (temperature.value === null ? '—°' : `${temperature.value}°`))

const fetchTemperature = async () => {
  if (!('geolocation' in navigator)) return

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        maximumAge: 10 * 60 * 1000,
        timeout: 5000
      })
    })

    const { latitude, longitude } = position.coords

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=temperature_2m` +
      `&temperature_unit=celsius` +
      `&timezone=auto`

    const response = await fetch(url)

    if (!response.ok) return

    const data = await response.json()

    const temp = data?.current?.temperature_2m

    if (typeof temp === 'number') temperature.value = Math.round(temp)
  } catch {
    // ignore
  }
}

onMounted(() => {
  timerId = window.setInterval(() => {
    now.value = new Date()
  }, 1000)

  fetchTemperature()

  tempTimerId = window.setInterval(fetchTemperature, 10 * 60 * 1000)
})

onUnmounted(() => {
  if (timerId) window.clearInterval(timerId)

  if (tempTimerId) window.clearInterval(tempTimerId)
})
</script>

<template>
  <header class="relative bg-blue-600 text-white">
    <div class="flex h-18 items-stretch">
      <!-- Back area (darker blue block) -->
      <button
        type="button"
        class="flex w-22 items-center justify-center bg-blue-700 transition hover:bg-blue-800"
        aria-label="Tillbaka"
      >
        <FontAwesomeIcon
          icon="chevron-left"
          class="text-2xl"
        />
      </button>

      <!-- Right area (content aligned to the right) -->
      <div class="flex flex-1 items-center justify-end pr-8 pl-6">
        <div class="flex items-center gap-3 text-base font-semibold whitespace-nowrap">
          <span>{{ displayTemperature }}</span>
          <FontAwesomeIcon
            icon="cog"
            class="text-lg"
          />
          <span class="text-white/70">|</span>
          <span>{{ displayDate }}</span>
          <span class="text-white/70">|</span>
          <span>{{ displayTime }}</span>
        </div>
      </div>
    </div>

    <!-- Center icon (perfectly centered in the whole header) -->
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <FontAwesomeIcon
        icon="check"
        class="text-3xl"
      />
    </div>
  </header>
</template>
