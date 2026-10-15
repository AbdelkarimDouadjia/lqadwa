CREATE TABLE `landing_content` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_json` text NOT NULL,
	`published_json` text NOT NULL,
	`draft_version` integer DEFAULT 0 NOT NULL,
	`published_version` integer DEFAULT 0 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	`published_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `landing_content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL,
	`content_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `landing_content_revisions_created_idx` ON `landing_content_revisions` (`created_at`);