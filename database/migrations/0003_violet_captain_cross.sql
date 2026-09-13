CREATE TABLE `event_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`registered_at` integer NOT NULL,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_registrations_event_user_idx` ON `event_registrations` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_registrations_user_id_idx` ON `event_registrations` (`user_id`);--> statement-breakpoint
CREATE INDEX `event_registrations_event_status_registered_at_idx` ON `event_registrations` (`event_id`,`status`,`registered_at`);--> statement-breakpoint
ALTER TABLE `events` ADD `capacity` integer;