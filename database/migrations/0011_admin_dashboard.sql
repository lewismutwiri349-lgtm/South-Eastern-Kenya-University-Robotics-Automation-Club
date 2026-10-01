-- Administration domain (Phase 6) — admin-owned audit log.
-- Hand-numbered 0011, continuing on from 0010_project_management.sql.
-- NOT produced by `drizzle-kit generate` — see docs/modules/admin-dashboard.md
-- §"Migration tooling note" for why, and what a future fix looks like.
CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`target_user_id` text,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_actor_user_id_idx` ON `admin_audit_logs` (`actor_user_id`);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_target_user_id_idx` ON `admin_audit_logs` (`target_user_id`);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_created_at_idx` ON `admin_audit_logs` (`created_at`);
