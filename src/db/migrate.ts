/**
 * Generic migration utility for running SQL migrations on any DB executor.
 * Usage: await runMigrations(executor, migrations)
 * executor: (sql: string) => Promise<void> | void
 * migrations: string[]
 */
export async function runMigrations(
  executor: (sql: string) => Promise<void> | void,
  migrations: string[]
) {
  for (const migration of migrations) {
    try {
      await executor(migration)
    } catch (e) {
      // Migration already applied or column exists
    }
  }
}
