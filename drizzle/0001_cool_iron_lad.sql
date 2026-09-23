CREATE TABLE `registered_pharmacies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`latitude` integer NOT NULL,
	`longitude` integer NOT NULL,
	`phone` text NOT NULL,
	`license` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`duty` integer DEFAULT 0 NOT NULL,
	`hours` text DEFAULT '08:00 — 20:00' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registered_pharmacies_owner_unique` ON `registered_pharmacies` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_registered_pharmacies_city_status` ON `registered_pharmacies` (`city`,`status`);