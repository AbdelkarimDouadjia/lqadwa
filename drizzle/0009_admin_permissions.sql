ALTER TABLE `admin_invites` ADD `permissions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_invites` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_members` ADD `permissions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_members` ADD `email` text DEFAULT '' NOT NULL;