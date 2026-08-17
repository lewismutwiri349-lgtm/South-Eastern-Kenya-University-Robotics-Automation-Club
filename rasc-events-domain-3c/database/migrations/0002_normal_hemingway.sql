CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer,
	`organizer_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_idx` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_organizer_id_idx` ON `events` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `events_status_start_at_idx` ON `events` (`status`,`start_at`);