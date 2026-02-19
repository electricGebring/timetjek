import { STAFF_REGISTER_SCHEMA } from './schema'

import { runMigrations } from '../migrate'

/**
 * Initializes the staff-register tables and runs migrations for both native and web.
 * Pass in the db instance and a function to execute SQL.
 */
export async function initStaffRegisterDb(db: unknown, isNative: boolean) {
  if (isNative) {
    // Type assertion for db to have execute method
    await (db as { execute: (sql: string) => Promise<unknown> }).execute(STAFF_REGISTER_SCHEMA)

    await runMigrations()
  }
 else {
    // Split schema by statements and execute individually for sql.js
    const statements = STAFF_REGISTER_SCHEMA.split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      try {
        (db as { run: (sql: string) => unknown }).run(statement + ';')
      }
 catch {
        console.warn('[DB] Statement already exists or minor error (safe):', statement.substring(0, 50))
      }
    }

    await runMigrations()
  }
}
