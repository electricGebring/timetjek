import type { TimeRegistrationStatus } from "@/enums/TimeRegistrationStatus";
import type { TimeRegistrationApplication } from "@/enums/TimeRegistrationApplication";

// Type definition for a work_entry row in database
export interface WorkEntry {
  id: number | null;
  work_day_id: number | null;
  employee_id: number;
  workplace_id: number;
  cost_center_id: number | null;

  // Status
  status: TimeRegistrationStatus;

  // Check-in data
  check_in_at: string | null;
  check_in_time_at: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_application: TimeRegistrationApplication;

  // Check-out data
  check_out_at: string | null;
  check_out_time_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_application: TimeRegistrationApplication | null;

  // Meal benefits
  meal_benefit_has_breakfast: boolean;
  meal_benefit_has_lunch: boolean;

  // Personal info
  name: string;
  type: string;
  personalNumber: string;

  // Break data
  break: string | null;

  // Metadata
  hasError: number;
  administrator_comment: string | null;
  total_working_seconds: number | null;
  total_break_seconds: number | null;

  // Timestamps
  updatedBy: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  deleted_at: string | null;

  // Sync state
  synced: number;
  deleted: number;
}
