/**
 * WorkEntryBreak schema and types – using pure TypeScript (no Zod)
 * Single source of truth: this file defines the work_entry_breaks table structure.
 * 
 * Raw values from SQL:
 * - Numbers: database INTEGER
 * - Strings: database TEXT
 * - Nulls: database NULL
 */

/** WorkEntryBreak type – matches database schema */
export type WorkEntryBreak = {
  id: number
  work_entry_id: string
  start_at: string | null
  end_at: string | null
  start_exact_at: string | null
  end_exact_at: string | null
  created_at: string
}

/** Column names in SELECT order – derived from WorkEntryBreak keys */
export const WORK_ENTRY_BREAK_COLUMNS = [
  'id',
  'work_entry_id',
  'start_at',
  'end_at',
  'start_exact_at',
  'end_exact_at',
  'created_at',
] as const satisfies readonly (keyof WorkEntryBreak)[]

export type WorkEntryBreakColumn = (typeof WORK_ENTRY_BREAK_COLUMNS)[number]

/** Input type for creating a new break (work_entry_id and generated fields excluded) */
export type CreateWorkEntryBreakInput = Omit<WorkEntryBreak, 'id' | 'work_entry_id' | 'created_at'> & {
  start_at?: string | null
  end_at?: string | null
  start_exact_at?: string | null
  end_exact_at?: string | null
}

/**
 * Parse a raw row object into a WorkEntryBreak.
 * Handles type coercion from SQLite results.
 */
export function parseWorkEntryBreakRow(raw: Record<string, unknown>): WorkEntryBreak {
  const coerceString = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'string') return v
    return String(v)
  }

  const requireNumber = (v: unknown, fieldName: string): number => {
    if (typeof v === 'number') {
      return v
    }
    throw new Error(`Invalid WorkEntryBreak: ${fieldName} is required and must be a number`)
  }

  const requireString = (v: unknown, fieldName: string): string => {
    if (typeof v === 'string') {
      return v
    }
    throw new Error(`Invalid WorkEntryBreak: ${fieldName} is required and must be a string`)
  }

  return {
    id: requireNumber(raw.id, 'id'),
    work_entry_id: requireString(raw.work_entry_id, 'work_entry_id'),
    start_at: coerceString(raw.start_at),
    end_at: coerceString(raw.end_at),
    start_exact_at: coerceString(raw.start_exact_at),
    end_exact_at: coerceString(raw.end_exact_at),
    created_at: requireString(raw.created_at, 'created_at'),
  }
}
