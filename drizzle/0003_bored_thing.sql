CREATE TABLE IF NOT EXISTS `sync_metadata` (
	`table_name` text PRIMARY KEY NOT NULL,
	`last_sync_timestamp` integer,
	`sync_token` text,
	`last_successful_sync` integer,
	`sync_state` text DEFAULT 'idle',
	`error_message` text
);
