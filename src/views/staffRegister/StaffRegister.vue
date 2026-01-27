<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HeaderBar from '@/components/HeaderBar.vue'
// import { fetchWorkSchemeData } from '@/api/workscheme'
import { useStaffRegisterStore } from '@/stores/staff-register/store'

const store = useStaffRegisterStore()
import { computed } from 'vue'

const sortedWorkEntries = computed(() => {
  const sorted = [...store.workEntries].sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })
  // ...existing code...
  return sorted;
})
const headerDate = ref('')
const headerTime = ref('')
onMounted(async () => {
  await store.loadWorkEntries();
  // Försök hämta headerDate/headerTime från första entry om de finns
  if (store.workEntries.length > 0) {
    headerDate.value = store.workEntries[0].headerDate || ''
    headerTime.value = store.workEntries[0].headerTime || ''
  }
  (window as any).staffRegisterData = store.workEntries;
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

const currentPage = ref(1)
const totalPages = ref(10)
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- App header (blue bar) -->
    <HeaderBar :header-date="headerDate" :header-time="headerTime" />

    <main class="mx-auto max-w-6xl px-8 py-6">
      <!-- Breadcrumbs -->
      <nav
        aria-label="Brödsmulor"
        class="mb-5 flex items-center gap-2 text-sm text-gray-600"
      >
        <a href="#" class="text-blue-600 hover:underline">Företag</a>
        <span class="text-gray-400">/</span>
        <a href="#" class="text-blue-600 hover:underline">Identifiera</a>
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
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="magnifying-glass"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Sök</span>
          </button>
          <button
            type="button"
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="download"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Exportera</span>
          </button>
          <button
            type="button"
            class="flex h-16 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-8 text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            <FontAwesomeIcon
              icon="print"
              class="text-xl"
            />
            <span class="text-lg font-semibold">Skriv ut</span>
          </button>
        </div>
      </section>

      <!-- Filters row -->
      <section class="mb-6 flex items-center justify-between gap-6">
        <!-- Filter/info row, can be customized or removed -->
        <div class="flex h-16 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 shadow-sm">
          <FontAwesomeIcon icon="calendar-days" class="text-lg text-gray-700" />
          <div class="font-semibold whitespace-nowrap text-gray-900">Arbetsperiod</div>
        </div>
        <div class="flex flex-1 items-center gap-10"></div>
        <button type="button" aria-label="Filter" class="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50">
          <FontAwesomeIcon icon="filter" class="text-gray-700" />
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
              <tr v-for="entry in sortedWorkEntries" :key="entry.id" class="bg-white">
                <td class="px-5 py-4">
                  <a href="#" class="font-semibold text-blue-600 hover:underline">{{ entry.name }}</a>
                </td>
                <td class="px-5 py-4">
                  <span class="inline-flex h-7 w-7 items-center justify-center rounded-full font-bold" :class="getTypeColor(entry.type)">{{ entry.type }}</span>
                </td>
                <td class="px-5 py-4 text-gray-900">{{ entry.personalNumber }}</td>
                <td class="px-5 py-4 text-gray-900">{{ entry.timeIn }}</td>
                <td class="px-5 py-4">
                  <span v-if="entry.timeOut" class="text-gray-900">{{ entry.timeOut }}</span>
                  <span v-else class="text-gray-400">&mdash;</span>
                </td>
                <td class="px-5 py-4">
                  <span v-if="entry.break" class="text-gray-900">{{ entry.break }}</span>
                  <span v-else class="text-gray-400">&mdash;</span>
                </td>
                <td class="px-5 py-4">
                  <span v-if="entry.workTime" class="text-gray-900">{{ entry.workTime }}</span>
                  <span v-else class="text-gray-400">&mdash;</span>
                </td>
                <td class="px-5 py-4">
                  <div v-if="entry.hasError">
                    <span class="inline-flex items-center gap-2 font-semibold" :class="getStatusColor(entry.statusType)">
                      <FontAwesomeIcon icon="circle-exclamation" class="text-red-600" />
                      {{ entry.status }}
                    </span>
                  </div>
                  <div v-else-if="entry.status" :class="getStatusColor(entry.statusType)">
                    <div class="font-semibold">{{ entry.status }}</div>
                    <div v-if="entry.updatedBy" class="text-xs text-gray-500">
                      av {{ entry.updatedBy }} {{ entry.updatedAt }}
                    </div>
                  </div>
                </td>
              </tr>
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