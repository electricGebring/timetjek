CREATE TABLE `work_entry_breaks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_entry_id` text NOT NULL,
	`start_at` text,
	`end_at` text,
	`start_exact_at` text,
	`end_exact_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`work_entry_id`) REFERENCES `work_entries`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_work_entry_breaks_work_entry_id` ON `work_entry_breaks` (`work_entry_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_work_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`employee_id` integer,
	`workplace_id` integer,
	`cost_center_id` integer,
	`work_day_id` integer,
	`status` text DEFAULT 'OPEN',
	`check_in_at` text,
	`check_in_time_at` text,
	`check_in_latitude` real,
	`check_in_longitude` real,
	`check_in_application` text DEFAULT 'APP',
	`check_out_at` text,
	`check_out_time_at` text,
	`check_out_latitude` real,
	`check_out_longitude` real,
	`check_out_application` text,
	`break` text,
	`meal_benefit_has_breakfast` integer DEFAULT 0,
	`meal_benefit_has_lunch` integer DEFAULT 0,
	`name` text,
	`type` text,
	`personalNumber` text,
	`administrator_comment` text,
	`total_working_seconds` integer,
	`total_break_seconds` integer,
	`hasError` integer DEFAULT 0,
	`updatedBy` text,
	`createdAt` text,
	`updatedAt` text,
	`deleted_at` text,
	`synced` integer DEFAULT 0,
	`deleted` integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_work_entries`("id", "remote_id", "employee_id", "workplace_id", "cost_center_id", "work_day_id", "status", "check_in_at", "check_in_time_at", "check_in_latitude", "check_in_longitude", "check_in_application", "check_out_at", "check_out_time_at", "check_out_latitude", "check_out_longitude", "check_out_application", "break", "meal_benefit_has_breakfast", "meal_benefit_has_lunch", "name", "type", "personalNumber", "administrator_comment", "total_working_seconds", "total_break_seconds", "hasError", "updatedBy", "createdAt", "updatedAt", "deleted_at", "synced", "deleted") SELECT "id", "remote_id", "employee_id", "workplace_id", "cost_center_id", "work_day_id", "status", "check_in_at", "check_in_time_at", "check_in_latitude", "check_in_longitude", "check_in_application", "check_out_at", "check_out_time_at", "check_out_latitude", "check_out_longitude", "check_out_application", "break", "meal_benefit_has_breakfast", "meal_benefit_has_lunch", "name", "type", "personalNumber", "administrator_comment", "total_working_seconds", "total_break_seconds", "hasError", "updatedBy", "createdAt", "updatedAt", "deleted_at", "synced", "deleted" FROM `work_entries`;--> statement-breakpoint
DROP TABLE `work_entries`;--> statement-breakpoint
ALTER TABLE `__new_work_entries` RENAME TO `work_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_work_entries_synced_deleted` ON `work_entries` (`synced`,`deleted`);--> statement-breakpoint
CREATE INDEX `idx_work_entries_work_day_id` ON `work_entries` (`work_day_id`);--> statement-breakpoint
CREATE INDEX `idx_work_entries_remote_id` ON `work_entries` (`remote_id`);