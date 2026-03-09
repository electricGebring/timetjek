import { integer, real, text, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import { TABLE_WORK_ENTRIES, TABLE_WORK_ENTRY_BREAKS } from '../constants/tables'

export const workEntries = sqliteTable(
  TABLE_WORK_ENTRIES,
  {
    id: text('id').primaryKey(),
    remote_id: text('remote_id'),
    employee_id: integer('employee_id'),
    workplace_id: integer('workplace_id'),
    cost_center_id: integer('cost_center_id'),
    work_day_id: integer('work_day_id'),
    status: text('status').default('OPEN'),
    check_in_at: text('check_in_at'),
    check_in_time_at: text('check_in_time_at'),
    check_in_latitude: real('check_in_latitude'),
    check_in_longitude: real('check_in_longitude'),
    check_in_application: text('check_in_application').default('APP'),
    check_out_at: text('check_out_at'),
    check_out_time_at: text('check_out_time_at'),
    check_out_latitude: real('check_out_latitude'),
    check_out_longitude: real('check_out_longitude'),
    check_out_application: text('check_out_application'),
    break: text('break'),
    meal_benefit_has_breakfast: integer('meal_benefit_has_breakfast').default(0),
    meal_benefit_has_lunch: integer('meal_benefit_has_lunch').default(0),
    name: text('name'),
    type: text('type'),
    personalNumber: text('personalNumber'),
    administrator_comment: text('administrator_comment'),
    total_working_seconds: integer('total_working_seconds'),
    total_break_seconds: integer('total_break_seconds'),
    hasError: integer('hasError').default(0),
    updatedBy: text('updatedBy'),
    createdAt: text('createdAt'),
    updatedAt: text('updatedAt'),
    deleted_at: text('deleted_at'),
    synced: integer('synced').default(0),
    deleted: integer('deleted').default(0)
  },
  (table) => ({
    idx_work_entries_synced_deleted: index('idx_work_entries_synced_deleted').on(table.synced, table.deleted),
    idx_work_entries_work_day_id: index('idx_work_entries_work_day_id').on(table.work_day_id),
    idx_work_entries_remote_id: index('idx_work_entries_remote_id').on(table.remote_id)
  })
)

export type WorkEntry = typeof workEntries.$inferSelect

export type NewWorkEntry = typeof workEntries.$inferInsert

export const workEntryBreaks = sqliteTable(
  TABLE_WORK_ENTRY_BREAKS,
  {
    id: text('id').primaryKey(),
    work_entry_id: text('work_entry_id')
      .notNull()
      .references(() => workEntries.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    start_at: text('start_at'),
    end_at: text('end_at'),
    start_exact_at: text('start_exact_at'),
    end_exact_at: text('end_exact_at'),
    created_at: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    deleted_at: text('deleted_at'),
    synced: integer('synced').default(0),
    deleted: integer('deleted').default(0)
  },
  (table) => ({
    idx_work_entry_breaks_work_entry_id: index('idx_work_entry_breaks_work_entry_id').on(table.work_entry_id),
    idx_work_entry_breaks_synced_deleted: index('idx_work_entry_breaks_synced_deleted').on(table.synced, table.deleted)
  })
)

export type WorkEntryBreak = typeof workEntryBreaks.$inferSelect

export type NewWorkEntryBreak = typeof workEntryBreaks.$inferInsert

export const syncMetadata = sqliteTable('sync_metadata', {
  table_name: text('table_name').primaryKey(),
  last_sync_timestamp: integer('last_sync_timestamp'),
  sync_token: text('sync_token'),
  last_successful_sync: integer('last_successful_sync'),
  sync_state: text('sync_state').default('idle'),
  error_message: text('error_message')
})

export type SyncMetadata = typeof syncMetadata.$inferSelect

export type NewSyncMetadata = typeof syncMetadata.$inferInsert
