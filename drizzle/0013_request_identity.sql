CREATE TABLE `request_identity` (
	`request` text PRIMARY KEY NOT NULL,
	`medicine_id` text,
	`catalog_version` text,
	`identity_json` text NOT NULL,
	`selection_source` text NOT NULL,
	`verification` text NOT NULL,
	`payload_json` text NOT NULL,
	FOREIGN KEY (`request`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade
);
