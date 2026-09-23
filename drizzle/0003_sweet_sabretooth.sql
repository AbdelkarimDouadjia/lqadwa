CREATE TABLE `admin_invites` (
	`hash` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`used_by` text
);
--> statement-breakpoint
CREATE TABLE `admin_members` (
	`owner` text PRIMARY KEY NOT NULL,
	`invited_by` text NOT NULL,
	`created` integer NOT NULL
);
