ALTER TABLE `profiles` ADD `details` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `health` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `registered_pharmacies` ADD `details` text DEFAULT '{}' NOT NULL;