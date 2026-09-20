CREATE TABLE `awards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`recipient_name` text NOT NULL,
	`category` text,
	`awarded_at` integer NOT NULL,
	`cover_image_url` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `awards_slug_idx` ON `awards` (`slug`);--> statement-breakpoint
CREATE INDEX `awards_author_id_idx` ON `awards` (`author_id`);--> statement-breakpoint
CREATE INDEX `awards_status_awarded_at_idx` ON `awards` (`status`,`awarded_at`);