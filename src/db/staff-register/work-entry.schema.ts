import { z } from 'zod'

/**
 * Raw value from SQL (number, string, or null). Booleans come as 0/1.
 * Single source of truth: column order here = SELECT order in queries.
 */
const nullableNumber = z.union([z.number(), z.null(), z.undefined()]).transform((v) => v ?? null)
const nullableString = z.union([z.string(), z.null(), z.undefined()]).transform((v) => v ?? null)
const optionalNumber = z.union([z.number(), z.null(), z.undefined()]).transform((v) => v ?? null)
const optionalString = z.union([z.string(), z.null(), z.undefined()]).transform((v) => v ?? null)
const booleanLike = z
  .union([z.literal(0), z.literal(1), z.boolean(), z.undefined()])
  .transform((v) => !!v)
const defaultZero = z.union([z.number(), z.null(), z.undefined()]).transform((v) => v ?? 0)

export const workEntryRowSchema = z
  .object({
    id: nullableNumber,
    employee_id: z.number(),
    workplace_id: z.number(),
    cost_center_id: nullableNumber,
    work_day_id: nullableNumber,
    status: z.string(),
    check_in_at: nullableString,
    check_in_time_at: nullableString,
    check_in_latitude: optionalNumber,
    check_in_longitude: optionalNumber,
    check_in_application: z.string(),
    check_out_at: nullableString,
    check_out_time_at: nullableString,
    check_out_latitude: optionalNumber,
    check_out_longitude: optionalNumber,
    check_out_application: optionalString,
    break: nullableString,
    meal_benefit_has_breakfast: booleanLike,
    meal_benefit_has_lunch: booleanLike,
    name: z.string(),
    type: z.string(),
    personalNumber: z.string(),
    administrator_comment: optionalString,
    total_working_seconds: optionalNumber,
    total_break_seconds: optionalNumber,
    hasError: defaultZero,
    updatedBy: optionalString,
    createdAt: nullableString,
    updatedAt: nullableString,
    deleted_at: nullableString,
    synced: z.number(),
    deleted: z.number()
  })
  .strict()

/** WorkEntry type – inferred from schema (single source of truth) */
export type WorkEntry = z.infer<typeof workEntryRowSchema>

/** Column names in SELECT order – derived from schema key order */
export const WORK_ENTRY_COLUMNS = Object.keys(
  workEntryRowSchema.shape
) as (keyof WorkEntry)[]

export type WorkEntryColumn = (typeof WORK_ENTRY_COLUMNS)[number]

/** Parse a raw row object (e.g. from row array + column names) into a validated WorkEntry */
export function parseWorkEntryRow(raw: Record<string, unknown>): WorkEntry {
  return workEntryRowSchema.parse(raw)
}
