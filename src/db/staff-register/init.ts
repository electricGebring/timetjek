import { STAFF_REGISTER_SCHEMA } from './schema'

import { runMigrations } from '../migrate'

/**
 * Initializes the staff-register tables and runs migrations for both native and web.
 * Pass in the db instance and a function to execute SQL.
 */
export async function initStaffRegisterDb(db: unknown, isNative: boolean) {
  if (isNative) {
    await db.execute(STAFF_REGISTER_SCHEMA)

    await runMigrations()
  }
 else {
    // Split schema by statements and execute individually for sql.js
    const statements = STAFF_REGISTER_SCHEMA.split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      try {
        db.run(statement + ';')
      }
 catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[DB] Statement already exists or minor error (safe):', statement.substring(0, 50))
      }
    }

    await runMigrations()
  }
}
