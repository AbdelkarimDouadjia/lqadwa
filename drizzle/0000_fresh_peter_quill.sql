CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`created` integer NOT NULL,
	`read` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_owner_created` ON `notifications` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `pharmacy_settings` (
	`owner` text NOT NULL,
	`pharmacy` text NOT NULL,
	`duty` integer NOT NULL,
	PRIMARY KEY(`owner`, `pharmacy`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text DEFAULT 'algiers' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`medicine` text NOT NULL,
	`city` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_requests_owner_created` ON `requests` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request` text NOT NULL,
	`pharmacy` text NOT NULL,
	`code` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_request` ON `reservations` (`request`);--> statement-breakpoint
CREATE INDEX `idx_reservations_owner` ON `reservations` (`owner`);--> statement-breakpoint
CREATE TABLE `responses` (
	`request` text NOT NULL,
	`pharmacy` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`updated` integer,
	PRIMARY KEY(`request`, `pharmacy`),
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action
);
