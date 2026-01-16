<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTodoStore } from '@/stores/todo/store'

const store = useTodoStore()
const newTodo = ref('')

onMounted(() => {
  store.loadTodos()
})

const addTodo = async () => {
  if (newTodo.value.trim()) {
    await store.addTodo(newTodo.value)
    newTodo.value = ''
  }
}

const deleteTodo = async (id: number) => {
  await store.deleteTodo(id)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
    <div class="mx-auto w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
      <!-- Header -->
      <h1 class="mb-12 text-center text-4xl font-light text-gray-800">Your To Do</h1>

      <!-- Add Todo Form -->
      <form
        @submit.prevent="addTodo"
        class="mb-20"
      >
        <div
          class="flex items-center border-b-2 border-indigo-200 pb-3 transition-colors focus-within:border-indigo-400"
        >
          <input
            v-model="newTodo"
            type="text"
            placeholder="Add new task"
            class="flex-1 text-gray-700 placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            class="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg"
          >
            <svg
              class="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
          </button>
        </div>
      </form>

      <!-- Loading State -->
      <div
        v-if="store.loading"
        class="py-12 text-center"
      >
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-700"></div>
      </div>

      <!-- Todos List -->
      <div
        v-else
        class="space-y-6"
      >
        <div
          v-for="t in store.todos"
          :key="t.id"
          class="flex items-center gap-4 rounded-xl border-2 border-indigo-100 bg-gradient-to-r from-white to-indigo-50/30 p-4 transition-all hover:border-indigo-200 hover:shadow-md"
        >
          <div
            class="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 transition-all"
            :class="t.done ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 hover:border-indigo-400'"
          >
            <svg
              v-if="t.done"
              class="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <span
            class="flex-1 font-medium text-gray-700"
            :class="{ 'text-gray-400 line-through': t.done }"
          >
            {{ t.title }}
          </span>
          <button
            @click="deleteTodo(t.id)"
            class="text-gray-400 transition-colors hover:text-rose-500"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="store.todos.length > 0"
        class="mt-10 text-center"
      >
        <p class="text-sm font-medium text-indigo-600">
          Your remaining todos: {{ store.todos.filter((t) => !t.done).length }}
        </p>
        <p class="mt-3 text-xs text-gray-500 italic">
          "Begin what you feel in the correctness of having awesome in your life" - Wayne Dyer
        </p>
      </div>
    </div>
  </div>
</template>
