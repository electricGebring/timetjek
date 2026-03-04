import { integer, real, text, sqliteTable, index } from 'drizzle-orm/sqlite-core'

export const workEntries = sqliteTable(
  'work_entries',
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
    deleted: integer('deleted').default(0),
  },
  (table) => ({
    idx_work_entries_synced_deleted: index('idx_work_entries_synced_deleted').on(
      table.synced,
      table.deleted
    ),
    idx_work_entries_work_day_id: index('idx_work_entries_work_day_id').on(table.work_day_id),
    idx_work_entries_remote_id: index('idx_work_entries_remote_id').on(table.remote_id),
  })
)

export type WorkEntry = typeof workEntries.$inferSelect

export type NewWorkEntry = typeof workEntries.$inferInsert
