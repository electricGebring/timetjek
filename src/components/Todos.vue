<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useTodoStore } from "@/stores/todo/store";

const store = useTodoStore()
const newTodo = ref("")

onMounted(() => {
  store.loadTodos()
})

const addTodo = async () => {
  if (newTodo.value.trim()) {
    await store.addTodo(newTodo.value)
    newTodo.value = ""
  }
}

const deleteTodo = async (id: number) => {
  await store.deleteTodo(id)
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
    <div class="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
      <!-- Header -->
      <h1 class="text-4xl font-light text-gray-800 mb-12 text-center">Your To Do</h1>

      <!-- Add Todo Form -->
      <form @submit.prevent="addTodo" class="mb-20">
        <div class="flex items-center border-b-2 border-indigo-200 pb-3 focus-within:border-indigo-400 transition-colors">
          <input
            v-model="newTodo"
            type="text"
            placeholder="Add new task"
            class="flex-1 text-gray-700 placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            class="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <svg
              class="w-5 h-5 text-white"
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
      <div v-if="store.loading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"
        ></div>
      </div>

      <!-- Todos List -->
      <div v-else class="space-y-6">
        <div
          v-for="t in store.todos"
          :key="t.id"
          class="flex items-center gap-4 p-4 bg-gradient-to-r from-white to-indigo-50/30 border-2 border-indigo-100 rounded-xl hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <div
            class="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all"
            :class="
              t.done
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-gray-300 hover:border-indigo-400'
            "
          >
            <svg
              v-if="t.done"
              class="w-3 h-3 text-white"
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
            class="flex-1 text-gray-700 font-medium"
            :class="{ 'line-through text-gray-400': t.done }"
          >
            {{ t.title }}
          </span>
          <button
            @click="deleteTodo(t.id)"
            class="text-gray-400 hover:text-rose-500 transition-colors"
          >
            <svg
              class="w-5 h-5"
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
      <div v-if="store.todos.length > 0" class="mt-10 text-center">
        <p class="text-sm text-indigo-600 font-medium">
          Your remaining todos: {{ store.todos.filter(t => !t.done).length }}
        </p>
        <p class="text-xs text-gray-500 mt-3 italic">
          "Begin what you feel in the correctness of having awesome in your life" - Wayne Dyer
        </p>
      </div>
    </div>
  </div>
</template>
