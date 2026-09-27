CREATE INDEX `idx_mobile_expiry` ON `mobile_sessions` (`expires`);--> statement-breakpoint
CREATE INDEX `idx_pharmacies_status_name` ON `registered_pharmacies` (`status`,`name`);--> statement-breakpoint
CREATE INDEX `idx_reservations_pharmacy_status` ON `reservations` (`pharmacy`,`status`,`expires`);--> statement-breakpoint
CREATE INDEX `idx_responses_pharmacy_status` ON `responses` (`pharmacy`,`status`);