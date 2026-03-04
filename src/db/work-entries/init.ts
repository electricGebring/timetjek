import { runMigrations } from '../migrate'

/**
 * Initializes the work-entries database using Drizzle migrations.
 * Schema is now managed by Drizzle ORM - no manual SQL schema execution needed.
 * All table creation and schema changes are handled via migrations.
 */
export async function initWorkEntriesDb(_db: unknown, _isNative: boolean) {
  // Drizzle migrations create all tables - no need to run manual schema SQL
  await runMigrations()
}
