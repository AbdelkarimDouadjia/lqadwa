CREATE TABLE `reservation_locations` (
	`reservation` text PRIMARY KEY NOT NULL,
	`latitude` integer NOT NULL,
	`longitude` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`reservation`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
