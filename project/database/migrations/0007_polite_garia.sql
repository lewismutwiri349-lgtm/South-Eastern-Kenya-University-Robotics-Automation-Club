CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`bio` text,
	`division_preference_primary` text,
	`division_preference_secondary` text,
	`submitted_at` integer,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_user_id_unique` ON `applications` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `applications_user_id_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `applications_submitted_at_idx` ON `applications` (`submitted_at`);--> statement-breakpoint
CREATE TABLE `aptitude_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`score` integer,
	`passed` integer,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `aptitude_tests_application_id_idx` ON `aptitude_tests` (`application_id`);--> statement-breakpoint
CREATE TABLE `interview_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `interview_slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interview_schedules_application_id_unique` ON `interview_schedules` (`application_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `interview_schedules_application_id_idx` ON `interview_schedules` (`application_id`);--> statement-breakpoint
CREATE INDEX `interview_schedules_slot_id_idx` ON `interview_schedules` (`slot_id`);--> statement-breakpoint
CREATE TABLE `interview_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`start_time` integer NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`max_capacity` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `interview_slots_start_time_idx` ON `interview_slots` (`start_time`);--> statement-breakpoint
CREATE TABLE `test_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`test_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `aptitude_tests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`question_id`) REFERENCES `test_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `test_answers_test_id_idx` ON `test_answers` (`test_id`);--> statement-breakpoint
CREATE INDEX `test_answers_question_id_idx` ON `test_answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `test_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`options` text NOT NULL,
	`correct_answer_index` integer NOT NULL,
	`difficulty` text NOT NULL,
	`topic` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `test_questions_topic_idx` ON `test_questions` (`topic`);