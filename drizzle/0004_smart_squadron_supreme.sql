ALTER TABLE `work_entry_breaks` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `work_entry_breaks` ADD `synced` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `work_entry_breaks` ADD `deleted` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `idx_work_entry_breaks_synced_deleted` ON `work_entry_breaks` (`synced`,`deleted`);