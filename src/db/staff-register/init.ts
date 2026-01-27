import { STAFF_REGISTER_SCHEMA, STAFF_REGISTER_MIGRATIONS } from './schema'
import { runMigrations } from '../migrate'

/**
 * Initializes the staff-register tables and runs migrations for both native and web.
 * Pass in the db instance and a function to execute SQL.
 */
export async function initStaffRegisterDb(db: any, isNative: boolean) {
  if (isNative) {
    await db.execute(STAFF_REGISTER_SCHEMA)
    await runMigrations((sql) => db.execute(sql), STAFF_REGISTER_MIGRATIONS)
  } else {
    db.run(STAFF_REGISTER_SCHEMA)
    await runMigrations((sql) => db.run(sql), STAFF_REGISTER_MIGRATIONS)
  }
}
