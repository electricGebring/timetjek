/**
 * Staff register DB schema – initial tables and indexes.
 * SQL lives in staff-register.schema.sql for editing and tooling; this file re-exports for init.
 */
import schemaSql from './staff-register.schema.sql?raw'

export const STAFF_REGISTER_SCHEMA: string = schemaSql
