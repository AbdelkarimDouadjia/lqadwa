CREATE TABLE `account_controls` (
	`owner` text PRIMARY KEY NOT NULL,
	`suspended` integer DEFAULT 0 NOT NULL,
	`reason` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_log` (`created`);--> statement-breakpoint
CREATE TABLE `device_links` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge` text NOT NULL,
	`code` text NOT NULL,
	`request_key` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`owner` text,
	`consumed` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_device_key_created` ON `device_links` (`request_key`,`created`);--> statement-breakpoint
CREATE TABLE `mobile_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mobile_owner` ON `mobile_sessions` (`owner`);