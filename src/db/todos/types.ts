// Typdefinition för en todo-rad i databasen
export interface Todo {
  id: number
  title: string
  done: number
  synced: number
  deleted: number
  updatedAt: number
  createdAt: number
}
