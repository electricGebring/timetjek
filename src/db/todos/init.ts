import { TODO_SCHEMA, TODO_MIGRATIONS } from './schema'
import { runMigrations } from '../migrate'

/**
 * Initializes the todos table and runs migrations for both native and web.
 * Pass in the db instance and a function to execute SQL.
 */
export async function initTodosDb(db: any, isNative: boolean) {
  if (isNative) {
    await db.execute(TODO_SCHEMA)
    await runMigrations((sql) => db.execute(sql), TODO_MIGRATIONS)
  } else {
    db.run(TODO_SCHEMA)
    await runMigrations((sql) => db.run(sql), TODO_MIGRATIONS)
  }
}
