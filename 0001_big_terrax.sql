CREATE TABLE `identity_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`target_user_id` text,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `identity_audit_logs_actor_user_id_idx` ON `identity_audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `identity_audit_logs_target_user_id_idx` ON `identity_audit_logs` (`target_user_id`);--> statement-breakpoint
CREATE INDEX `identity_audit_logs_created_at_idx` ON `identity_audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `identity_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`route` text NOT NULL,
	`identifier_hash` text NOT NULL,
	`request_count` integer NOT NULL,
	`window_started_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `identity_rate_limits_route_identifier_idx` ON `identity_rate_limits` (`route`,`identifier_hash`);--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`author_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_articles_slug_idx` ON `news_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `news_articles_author_id_idx` ON `news_articles` (`author_id`);--> statement-breakpoint
CREATE INDEX `news_articles_status_published_at_idx` ON `news_articles` (`status`,`published_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `failed_login_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `locked_until` integer;