<script setup>
defineProps({
  headerDate: { type: String, default: '' },
  headerTime: { type: String, default: '' }
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
          <span>5°</span>
          <FontAwesomeIcon
            icon="cog"
            class="text-lg"
          />
          <span class="text-white/70">|</span>
          <span>{{ headerDate }}</span>
          <span class="text-white/70">|</span>
          <span>{{ headerTime }}</span>
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
