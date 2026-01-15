import { defineStore } from 'pinia'
import * as domain from '@/domain/domain'

export const useTodoStore = defineStore('todos', {
  state: () => ({
    todos: [] as any[],
    loading: false
  }),

  actions: {
    /**
     * Loads all todos from domain.
     */
    async loadTodos() {
      this.loading = true
      this.todos = await domain.getAll()
      this.loading = false
    },

    async updateTodos(todos: any[]) {
      this.todos = todos    
    },

    /**
     * Adds a new todo. Domain handles all logic.
     * @param title - The title of the new todo
     */
    async addTodo(title: string) {
      await domain.create(title)
    },

    async deleteTodo(id: number) {
      await domain.deleteTodo(id)
    }
  }
})
