CREATE TABLE `stock_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pharmacy` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`pharmacy`) REFERENCES `registered_pharmacies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stock_items_pharmacy_name` ON `stock_items` (`pharmacy`,`name`);