import { TODO_SCHEMA, TODO_MIGRATIONS } from './schema'
import { runMigrations } from '../migrate'

/**
 * Initializes the todos table and runs migrations for both native and web.
 * Pass in the db instance and a function to execute SQL.
 */
export async function initTodosDb(db: any, isNative: boolean) {
  if (isNative) {
    await db.execute(TODO_SCHEMA)
    for (const sql of TODO_MIGRATIONS) {
      try { await db.execute(sql) } catch (e) { /* ignore if already exists */ }
    }
    await runMigrations()
  } else {
    db.run(TODO_SCHEMA)
    for (const sql of TODO_MIGRATIONS) {
      try { db.run(sql) } catch (e) { /* ignore if already exists */ }
    }
    await runMigrations()
  }
}
