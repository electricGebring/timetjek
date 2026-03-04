/**
 * DEPRECATED: This file is kept for backwards compatibility only.
 * 
 * Schema is now managed by Drizzle ORM in src/db/schema.ts
 * All table definitions and migrations are handled via Drizzle Kit.
 * 
 * DO NOT edit work-entries.schema.sql - it is no longer used for database initialization.
 * Instead, update src/db/schema.ts and run `npx drizzle-kit generate` to create migrations.
 */
import schemaSql from './work-entries.schema.sql?raw'

export const WORK_ENTRIES_SCHEMA: string = schemaSql

// Backwards compatibility: prefer WORK_ENTRIES_SCHEMA in new code.
export const STAFF_REGISTER_SCHEMA: string = WORK_ENTRIES_SCHEMA
