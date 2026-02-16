import { TABLE_WORK_ENTRIES } from '@/constants/tables'
import { WORK_ENTRY_COLUMNS } from '@/models/work-entry.schema'

const T = TABLE_WORK_ENTRIES
const COLS = WORK_ENTRY_COLUMNS.join(', ')

/** All parameterized SQL for work_entries table. Single place for statements. */
export const WORK_ENTRY_SQL = {
  SELECT_WHERE: `SELECT ${COLS} FROM ${T}`,
  SELECT_ID: `SELECT id FROM ${T} WHERE id = ?`,
  UPDATE_SOFT_DELETE: `UPDATE ${T} SET deleted_at = ?, synced = 0 WHERE id = ?`,
  UPDATE_RESTORE: `UPDATE ${T} SET deleted_at = NULL, synced = 0 WHERE id = ?`,
  UPDATE_SYNCED: `UPDATE ${T} SET synced = 1 WHERE id = ?`,
  UPDATE_FULL: `UPDATE ${T} SET employee_id=?, workplace_id=?, cost_center_id=?, work_day_id=?, status=?, check_in_at=?, check_in_time_at=?, check_in_latitude=?, check_in_longitude=?, check_in_application=?, check_out_at=?, check_out_time_at=?, check_out_latitude=?, check_out_longitude=?, check_out_application=?, break=?, meal_benefit_has_breakfast=?, meal_benefit_has_lunch=?, name=?, type=?, personalNumber=?, administrator_comment=?, total_working_seconds=?, total_break_seconds=?, hasError=?, updatedBy=?, createdAt=?, updatedAt=?, deleted_at=?, synced=?, deleted=? WHERE id=?`,
  INSERT_WITH_ID: `INSERT INTO ${T} (id, employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  INSERT_AUTO_ID: `INSERT INTO ${T} (employee_id, workplace_id, cost_center_id, work_day_id, status, check_in_at, check_in_time_at, check_in_latitude, check_in_longitude, check_in_application, check_out_at, check_out_time_at, check_out_latitude, check_out_longitude, check_out_application, break, meal_benefit_has_breakfast, meal_benefit_has_lunch, name, type, personalNumber, administrator_comment, total_working_seconds, total_break_seconds, hasError, updatedBy, createdAt, updatedAt, deleted_at, synced, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  DELETE_BY_ID: `DELETE FROM ${T} WHERE id = ?`
} as const
