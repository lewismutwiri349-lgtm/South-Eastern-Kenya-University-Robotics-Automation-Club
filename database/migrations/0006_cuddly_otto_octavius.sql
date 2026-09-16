CREATE TABLE `contact_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`submitter_ip_hash` text,
	`handled_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_messages_created_at_idx` ON `contact_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `contact_messages_handled_at_idx` ON `contact_messages` (`handled_at`);--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`caption` text NOT NULL,
	`image_url` text NOT NULL,
	`category` text,
	`captured_at` integer NOT NULL,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gallery_items_slug_idx` ON `gallery_items` (`slug`);--> statement-breakpoint
CREATE INDEX `gallery_items_author_id_idx` ON `gallery_items` (`author_id`);--> statement-breakpoint
CREATE INDEX `gallery_items_status_captured_at_idx` ON `gallery_items` (`status`,`captured_at`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`url` text NOT NULL,
	`category` text,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resources_slug_idx` ON `resources` (`slug`);--> statement-breakpoint
CREATE INDEX `resources_author_id_idx` ON `resources` (`author_id`);--> statement-breakpoint
CREATE INDEX `resources_status_published_at_idx` ON `resources` (`status`,`published_at`);